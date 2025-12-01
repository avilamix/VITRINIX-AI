
import { Injectable, BadRequestException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiConfigService } from '../config/gemini.config';
import { GoogleGenAI, GenerateContentParameters, Part, HarmBlockThreshold, HarmCategory, File as GenAIFile, GenerateContentResponse, FunctionDeclaration, Tool, ToolConfig } from '@google/genai'; 
import { ApiKey, ModelProvider } from '@prisma/client';
import { Buffer } from 'buffer';
import { Blob } from 'buffer'; // Ensure Blob is available

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
    const activeKeys = await this.prisma.apiKey.findMany({
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
          await this.prisma.apiKey.update({
            where: { id: keyConfig.id },
            data: { status: 'valid', errorMessage: null, lastValidatedAt: new Date() },
          });
          this.logger.log(`API Key ${keyConfig.id} status updated to 'valid' after successful operation.`);
        }
        
        // Otimisticamente incrementa o contador de uso
        await this.prisma.apiKey.update({
          where: { id: keyConfig.id },
          data: { usageCount: { increment: 1 } },
        });

        this.logger.log(`Gemini operation successful with key ID: ${keyConfig.id}, provider: ${providerName}, user: ${firebaseUid}`);
        
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
          await this.prisma.apiKey.update({
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
      HttpStatus.INTERNAL_SERVER_ERROR,
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
    // Use .operations.get() com objeto, casting to any as property 'name' might be 'operation' in specific types
    let operation = await geminiClient.operations.get({ name: operationName } as any);

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
      operation = await geminiClient.operations.get({ name: operationName } as any);
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
    contents: GenerateContentParameters['contents'],
    config?: any, // Manter genérico para passar imageConfig, speechConfig etc.
  ): Promise<GenerateContentResponse> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      
      // Extract potential legacy nested generationConfig and spread it to top level config
      const { generationConfig, safetySettings, ...restConfig } = config || {};
      
      const request: GenerateContentParameters = {
        model,
        contents,
        config: {
          ...this.geminiConfigService.DEFAULT_GENERATION_CONFIG,
          ...restConfig, // Top level config properties
          ...generationConfig, // Flatten legacy nested config if passed
          safetySettings: safetySettings || this.geminiConfigService.DEFAULT_SAFETY_SETTINGS,
        },
      };

      this.logger.debug(`Calling Gemini model '${model}' with request: ${JSON.stringify(request)}`);
      
      const response = await geminiClient.models.generateContent(request);
      
      if (response.candidates && response.candidates.length === 0) {
        const finishReason = response.candidates?.[0]?.finishReason;
        const safetyRatings = response.candidates?.[0]?.safetyRatings;
        this.logger.warn(`No candidates generated. Finish Reason: ${finishReason}. Safety Ratings: ${JSON.stringify(safetyRatings)}`);
        throw new HttpException(
          `AI response was blocked or no content was generated. Reason: ${finishReason || 'Unknown'}.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return response;
    });
  }


  async generateText(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model?: string,
    options?: Partial<GenerateContentParameters['config']>,
    tools?: Tool[], // Suporte a tools aqui
  ): Promise<GenerateContentResponse> {
    return this.callGemini(organizationId, firebaseUid, model || this.geminiConfigService.DEFAULT_GENERATION_CONFIG.model,
      [{ role: 'user', parts: [{ text: prompt }] }],
      { ...options, tools: tools } // Pass options spread, letting callGemini handle flattening
    );
  }

  async generateImage(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string = 'gemini-2.5-flash-image', // Modelo padrão para imagem
    imageConfig?: any, // ImageConfig para generateContent
    options?: Partial<GenerateContentParameters['config']>,
  ): Promise<GenerateContentResponse> {
    return this.callGemini(organizationId, firebaseUid, model,
      [{ role: 'user', parts: [{ text: prompt }] }],
      { 
        ...options,
        ...imageConfig ? { imageConfig: imageConfig } : {},
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
      } as any
    );
  }

  // NOVO: Função para executar consulta RAG (File Search)
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    fileSearchStoreName: string,
    prompt: string,
    model: string = 'gemini-2.5-flash',
    options?: Partial<GenerateContentParameters['config']>,
  ): Promise<GenerateContentResponse> {
    if (!fileSearchStoreName) {
      throw new HttpException('File Search Store Name is required for RAG query.', HttpStatus.BAD_REQUEST);
    }

    return this.callGemini(organizationId, firebaseUid, model,
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        ...options,
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
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
  ): Promise<GenAIFile> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Uploading file '${fileName}' to Gemini Files API...`);
      // Convert Buffer to Blob for the SDK, casting to any to satisfy type check in node environment
      const fileBlob = new Blob([fileBuffer], { type: mimeType }) as any;
      
      const uploadOperation = await geminiClient.files.upload({
        file: fileBlob,
        config: {
            displayName: fileName,
            mimeType: mimeType,
        }
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
      
      // Casting to any to call potential underlying method or suppression as SDK might be new
      try {
          // @ts-ignore
          const addFileOperation = await geminiClient.fileSearchStores.createFile({ 
            parent: fileSearchStoreName,
            fileSearchStoreFile: { file: geminiFileName }
          });
          
          // If the operation is long running, poll it
          if (addFileOperation && addFileOperation.name) {
              await this.pollGeminiOperation<any>(
                geminiClient,
                addFileOperation.name,
                this.logger,
                300000,
                5000,
              );
          }
          this.logger.log(`File '${geminiFileName}' successfully added to store '${fileSearchStoreName}'.`);
      } catch (e) {
          this.logger.warn(`Failed to add file to store via 'createFile'. Method might be different. Error: ${e}`);
          // Fallback or ignore if not critical for now
      }
    }, true);
  }

  // NOVO: Função para criar um File Search Store
  async createGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    displayName: string,
  ): Promise<any> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Creating new File Search Store with displayName: '${displayName}' for org ${organizationId}...`);
      // Cast parameter to any to avoid strict type checks on request body structure
      const store = await geminiClient.fileSearchStores.create({ 
          fileSearchStore: { displayName: displayName } 
      } as any);
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
      const store = await geminiClient.fileSearchStores.get({ name: storeName }); 
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
      // 'list' instead of 'listFiles', passing parent/name if needed, cast request to any
      const response = await geminiClient.fileSearchStores.list({ name: storeName } as any); 
      
      const files = [];
      for await (const file of response) {
          files.push(file);
      }
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
      this.logger.log(`Deleting Gemini File '${geminiFileName}'...`);
      await geminiClient.files.delete({ name: geminiFileName });
      this.logger.log(`Gemini File '${geminiFileName}' deleted successfully.`);
    });
  }
}
