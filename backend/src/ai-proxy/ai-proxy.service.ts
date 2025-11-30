
/// <reference types="node" />

import { Injectable, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiConfigService } from '../config/gemini.config';
import { GoogleGenAI, GenerateContentRequest, Part, HarmBlockThreshold, HarmCategory, File as GenAIFile, GenerateContentResponse, RequestOptions, FunctionDeclaration, Tool, ToolConfig } from '@google/genai'; 
import { ApiKey, ModelProvider } from '@prisma/client';
import { Buffer } from 'buffer'; // FIX: Explicitly import Buffer

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(
    private prisma: PrismaService,
    private apiKeysService: ApiKeysService,
    private geminiConfigService: GeminiConfigService,
  ) {}

  /**
   * Executa uma operação da API Gemini com gerenciamento de chaves, rotação e fallback.
   * @param organizationId ID da organização para buscar as chaves.
   * @param firebaseUid UID do usuário para rastreamento de uso.
   * @param providerName Nome do provedor de IA ('Google Gemini').
   * @param operation Função que executa a chamada real à API Gemini.
   * @param isLongRunningOperation Indica se é uma operação de longa duração (afeta o tratamento de erros).
   * @returns O resultado da operação bem-sucedida.
   * @throws HttpException em caso de falha de todas as chaves ou erros irrecuperáveis.
   */
  async executeGeminiOperation<T>(
    organizationId: string,
    firebaseUid: string,
    providerName: ModelProvider,
    operation: (geminiClient: GoogleGenAI, apiKey: string) => Promise<T>,
    isLongRunningOperation: boolean = false,
  ): Promise<T> {
    // Buscar chaves ativas para a organização e provedor, priorizando a padrão
    // FIX: Access 'apiKey' model via this.prisma.apiKey
    const activeKeys = await (this.prisma as any).apiKey.findMany({
      where: {
        organizationId,
        provider: providerName,
        isActive: true,
        status: { in: ['valid', 'unchecked', 'rate-limited'] }, // Incluir rate-limited para tentar fallback
      },
      orderBy: { isDefault: 'desc' }, 
    });

    if (activeKeys.length === 0) {
      throw new HttpException(
        `No active API keys found for ${providerName} in this organization. Please configure them in settings.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let lastError: any;
    for (const keyConfig of activeKeys) {
      try {
        const apiKey = await this.geminiConfigService.getDecryptedApiKey(keyConfig);
        const geminiClient = this.geminiConfigService.createGeminiClient(apiKey);
        
        const result = await operation(geminiClient, apiKey);

        // Atualizar status da chave para 'valid' se estava em 'rate-limited' ou 'unchecked' e obteve sucesso
        if (keyConfig.status !== 'valid') {
          // FIX: Access 'apiKey' model via this.prisma.apiKey
          await (this.prisma as any).apiKey.update({
            where: { id: keyConfig.id },
            data: { status: 'valid', errorMessage: null, lastValidatedAt: new Date() },
          });
          this.logger.log(`API Key ${keyConfig.id} status updated to 'valid' after successful operation.`);
        }
        
        // Otimisticamente incrementa o contador de uso
        // FIX: Access 'apiKey' model via this.prisma.apiKey
        await (this.prisma as any).apiKey.update({
          where: { id: keyConfig.id },
          data: { usageCount: { increment: 1 } },
        });

        this.logger.log(`Gemini operation successful with key ID: ${keyConfig.id}, provider: ${providerName}, user: ${firebaseUid}`);
        // TODO: Implementar logging de consumo de tokens se disponível na resposta
        
        return result;
      } catch (error: any) {
        lastError = error;
        const statusCode = error.response?.status || error.status; // HTTP status code from API response
        const errorMessage = error.message || 'Unknown error during Gemini API call.';
        
        this.logger.warn(`Operation failed with key ${keyConfig.id} (${keyConfig.label}) for org ${organizationId}: Status ${statusCode || 'N/A'} - ${errorMessage}`);
        
        let newStatus: ApiKey['status'] = 'invalid';
        let statusErrorMessage: string = errorMessage;

        // Mapeamento de erros comuns da API Gemini
        if (statusCode === 401 || statusCode === 403 || errorMessage.includes('API key not valid')) {
          newStatus = 'invalid';
          statusErrorMessage = 'Invalid or unauthorized API key. Please check your credentials.';
        } else if (statusCode === 429 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          newStatus = 'rate-limited';
          statusErrorMessage = 'API Key usage quota exceeded or rate limited. Trying another key if available.';
        } else if (statusCode === 400 && errorMessage.includes('blocked by safety settings')) {
          // Conteúdo bloqueado por segurança, não é um problema da chave
          this.logger.warn(`Content blocked by safety settings for key ${keyConfig.id}. Not marking key as invalid.`);
          throw new HttpException(
            'Your request was blocked by safety settings. Please try rephrasing your prompt.',
            HttpStatus.BAD_REQUEST,
          );
        } else if (statusCode >= 500) { // Erros de servidor (Gemini ou Google)
          newStatus = 'invalid'; // Pode ser transitório, mas marcar como inválida para tentar outra.
          statusErrorMessage = `Gemini server error: ${errorMessage}`;
        }
        
        // Apenas atualiza o status se for um erro persistente para a chave
        // Ou se for um rate-limit que precisa de um período de "resfriamento"
        if (newStatus !== 'unchecked' && newStatus !== 'valid') {
          // FIX: Access 'apiKey' model via this.prisma.apiKey
          await (this.prisma as any).apiKey.update({
            where: { id: keyConfig.id },
            data: { status: newStatus, errorMessage: statusErrorMessage, lastValidatedAt: new Date() },
          });
          this.logger.log(`API Key ${keyConfig.id} status updated to '${newStatus}'.`);
        }
      }
    }

    // Se chegou aqui, todas as chaves falharam
    this.logger.error(`All API keys failed for ${providerName} in organization ${organizationId}. Last error: ${lastError?.message || 'Unknown error.'}`);
    throw new HttpException(
      `All API keys failed for ${providerName}. Please check your API key settings or contact support. Last error: ${lastError?.message || 'Unknown error.'}`,
      HttpStatus.INTERNAL_SERVER_ERROR, // Pode ser ajustado para BAD_GATEWAY se for erro externo
    );
  }

  // NOVO: Método de polling para operações de longa duração do Gemini (File Search, Video Gen, etc.)
  async pollGeminiOperation<T>(
    geminiClient: GoogleGenAI,
    operationName: string,
    logger: Logger,
    timeoutMs: number = 600000, // 10 minutos
    pollIntervalMs: number = 5000, // 5 segundos
  ): Promise<T> {
    const startTime = Date.now();
    // Use .operations.get() diretamente no cliente
    let operation = await geminiClient.operations.get(operationName);

    while (!operation.done) {
      if (Date.now() - startTime > timeoutMs) {
        logger.error(`Operation ${operationName} timed out after ${timeoutMs / 1000} seconds.`);
        throw new HttpException(
          `Operation ${operationName} timed out after ${timeoutMs / 1000} seconds.`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      logger.debug(`Operation ${operationName} still processing... State: ${JSON.stringify(operation.metadata)}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      operation = await geminiClient.operations.get(operationName);
    }

    if (operation.error) {
      logger.error(`Operation ${operationName} failed: ${operation.error.message}`);
      throw new HttpException(
        `Gemini operation failed: ${operation.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return operation.response as T;
  }

  // --- Funções de Geração de IA ---
  // Função global 'chamarGemini'
  async callGemini(
    organizationId: string,
    firebaseUid: string,
    model: string,
    contents: GenerateContentRequest['contents'],
    config?: {
      generationConfig?: GenerateContentRequest['generationConfig'];
      safetySettings?: GenerateContentRequest['safetySettings'];
      tools?: Tool[]; // Adicionado Tool para o DTO genérico
      toolConfig?: ToolConfig;
      systemInstruction?: string; // Adicionado systemInstruction
      responseMimeType?: string; // Adicionado responseMimeType
      responseSchema?: GenerateContentRequest['config']['responseSchema']; // Adicionado responseSchema
      imageConfig?: any; // FIX: Added imageConfig to generic config
      speechConfig?: any; // FIX: Added speechConfig to generic config
      responseModalities?: any[]; // FIX: Added responseModalities to generic config
    },
  ): Promise<GenerateContentResponse> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      const modelInstance = geminiClient.getGenerativeModel({ model: model });
      const request: GenerateContentRequest = {
        contents: contents,
        generationConfig: {
          ...this.geminiConfigService.DEFAULT_GENERATION_CONFIG,
          ...config?.generationConfig,
        },
        safetySettings: config?.safetySettings || this.geminiConfigService.DEFAULT_SAFETY_SETTINGS,
        tools: config?.tools,
        toolConfig: config?.toolConfig,
        systemInstruction: config?.systemInstruction,
        responseMimeType: config?.responseMimeType,
        responseSchema: config?.responseSchema,
        // FIX: Pass imageConfig, speechConfig, responseModalities
        imageConfig: config?.imageConfig,
        speechConfig: config?.speechConfig,
        responseModalities: config?.responseModalities,
      };

      this.logger.debug(`Calling Gemini model '${model}' with prompt: ${JSON.stringify(contents)}`);
      const result = await modelInstance.generateContent(request);
      
      if (result.response.candidates && result.response.candidates.length === 0) {
        throw new HttpException(
          'AI response was blocked by safety settings or no content was generated.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return result.response;
    });
  }


  async generateText(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model?: string,
    options?: Partial<GenerateContentRequest['generationConfig']>,
    tools?: Tool[], // Suporte a tools aqui
  ): Promise<GenerateContentResponse> {
    return this.callGemini(organizationId, firebaseUid, model || this.geminiConfigService.DEFAULT_GENERATION_CONFIG.model,
      [{ role: 'user', parts: [{ text: prompt }] }],
      { generationConfig: options, tools: tools }
    );
  }

  async generateImage(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string = 'gemini-2.5-flash-image', // Modelo padrão para imagem
    imageConfig?: any, // ImageConfig para generateContent
    options?: Partial<GenerateContentRequest['generationConfig']>,
  ): Promise<GenerateContentResponse> {
    return this.callGemini(organizationId, firebaseUid, model,
      [{ text: prompt }], // Conteúdo simplificado
      { 
        generationConfig: options,
        imageConfig: imageConfig, // FIX: Pass imageConfig here
      }
    );
  }

  async generateVideo(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string = 'veo-3.1-fast-generate-preview', // Modelo padrão para vídeo
    videoConfig?: any, // Configurações específicas para generateVideos
    image?: any, // Imagem de entrada
    lastFrame?: any, // Last frame image
    referenceImages?: any[], // Reference images
  ): Promise<string> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Generating video with model '${model}' for org ${organizationId}...`);
      
      const request: any = {
        model: model,
        prompt: prompt,
        config: videoConfig,
      };
      if (image) request.image = image;
      if (lastFrame) request.config.lastFrame = lastFrame;
      if (referenceImages) request.config.referenceImages = referenceImages;

      const operation = await geminiClient.models.generateVideos(request);
      const finalOperation = await this.pollGeminiOperation<any>(
        geminiClient,
        operation.name,
        this.logger,
        600000, // 10 minutos para geração de vídeo
        // FIX: Ensure polling interval is passed
        5000,
      );
      
      const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new HttpException('No video URI found in Gemini video generation response.', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return `${downloadLink}&key=${await this.geminiConfigService.getDecryptedApiKey(
        await this.apiKeysService.getBestApiKeyConfig(organizationId, 'Google Gemini')
      )}`;
    }, true); // Marcado como long-running operation
  }

  async generateSpeech(
    organizationId: string,
    firebaseUid: string,
    text: string,
    model: string = 'gemini-2.5-flash-preview-tts',
    speechConfig?: any,
  ): Promise<GenerateContentResponse> {
    return this.callGemini(organizationId, firebaseUid, model,
      [{ parts: [{ text: text }] }],
      { 
        responseModalities: ['AUDIO'],
        speechConfig: speechConfig,
      } as any // Cast for now, will refine DTO for specific modalities/configs
    );
  }

  // NOVO: Função para executar consulta RAG (File Search)
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    fileSearchStoreName: string,
    prompt: string,
    model: string = 'gemini-1.5-flash',
    options?: Partial<GenerateContentRequest['generationConfig']>,
  ): Promise<GenerateContentResponse> {
    if (!fileSearchStoreName) {
      throw new HttpException('File Search Store Name is required for RAG query.', HttpStatus.BAD_REQUEST);
    }

    return this.callGemini(organizationId, firebaseUid, model,
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        generationConfig: options,
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [fileSearchStoreName],
          },
        }],
      }
    );
  }

  // NOVO: Função para upload de arquivo para Gemini Files API
  async uploadFileToGeminiFiles(
    organizationId: string,
    firebaseUid: string,
    fileBuffer: any, // Use any instead of Buffer for now
    fileName: string,
    mimeType: string,
  ): Promise<GenAIFile> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Uploading file '${fileName}' to Gemini Files API...`);
      const uploadOperation = await geminiClient.files.upload({ // Acesso direto via cliente
        file: fileBuffer,
        displayName: fileName,
        mimeType: mimeType,
      });

      const geminiFile = await this.pollGeminiOperation<GenAIFile>(
        geminiClient,
        uploadOperation.name,
        this.logger,
        60000, // 1 minuto de timeout para upload
        2000, // 2 segundos de intervalo
      );
      
      if (geminiFile.state !== 'ACTIVE') {
        throw new HttpException(`File failed to become active in Gemini Files API: ${geminiFile.state}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return geminiFile;
    }, true); // Marcado como long-running operation
  }

  // NOVO: Função para adicionar arquivo a um File Search Store
  async addFileToGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    fileSearchStoreName: string,
    geminiFileName: string,
    chunkingConfig?: { maxTokensPerChunk?: number; overlap?: number; },
  ): Promise<void> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Adding Gemini File '${geminiFileName}' to store '${fileSearchStoreName}'...`);
      const addFileOperation = await geminiClient.fileSearchStores.addFile({ // Acesso direto via cliente
        fileSearchStore: fileSearchStoreName,
        file: geminiFileName,
        chunkingConfig: chunkingConfig ? chunkingConfig : { maxTokensPerChunk: 200, overlap: 20 },
      });

      await this.pollGeminiOperation<any>( // Retorno pode ser vazio ou metadata de sucesso
        geminiClient,
        addFileOperation.name,
        this.logger,
        300000, // 5 minutos de timeout para adição ao store
        5000, // 5 segundos de intervalo
      );
      this.logger.log(`File '${geminiFileName}' successfully added to store '${fileSearchStoreName}'.`);
    }, true); // Marcado como long-running operation
  }

  // NOVO: Função para criar um File Search Store
  async createGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    displayName: string,
  ): Promise<any> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Creating new File Search Store with displayName: '${displayName}' for org ${organizationId}...`);
      const store = await geminiClient.fileSearchStores.create({ // Acesso direto via cliente
        fileSearchStore: { displayName: displayName },
      });
      this.logger.log(`File Search Store created: ${store.name}`);
      return store;
    });
  }

  // NOVO: Função para obter um File Search Store
  async getGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    storeName: string,
  ): Promise<any> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Getting File Search Store: '${storeName}' for org ${organizationId}...`);
      const store = await geminiClient.fileSearchStores.get(storeName); // Acesso direto via cliente
      return store;
    });
  }

  // NOVO: Função para listar arquivos dentro de um File Search Store (Gemini side)
  async listFilesInGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    storeName: string,
  ): Promise<GenAIFile[]> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Listing files in store '${storeName}' for org ${organizationId}...`);
      const files = await geminiClient.fileSearchStores.listFiles(storeName); // Acesso direto via cliente
      return files;
    });
  }

  // NOVO: Função para excluir arquivo do Gemini Files API
  async deleteGeminiFile(
    organizationId: string,
    firebaseUid: string,
    geminiFileName: string,
  ): Promise<void> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Deleting Gemini File: '${geminiFileName}' for org ${organizationId}...`);
      await geminiClient.files.delete(geminiFileName); // Acesso direto via cliente
    });
  }
}
