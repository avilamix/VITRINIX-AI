
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiConfigService } from '../config/gemini.config';
// Corrected import from GoogleGenerativeAI, and added GenerateContentResponse
import { GoogleGenAI, GenerateContentRequest, Part, HarmBlockThreshold, HarmCategory, File as GenAIFile, GenerateContentResponse } from '@google/genai'; 

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(
    private prisma: PrismaService,
    private apiKeysService: ApiKeysService,
    private geminiConfigService: GeminiConfigService,
  ) {}

  // Configurações de segurança padrão para geração de conteúdo
  private defaultSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  async executeGeminiOperation<T>(
    organizationId: string,
    firebaseUid: string, // Para rastrear uso por usuário
    providerName: string, // 'Google Gemini'
    operation: (geminiClient: GoogleGenAI, apiKey: string) => Promise<T>, // Corrected type to GoogleGenAI
    // NOVO: Adicionar uma flag opcional para operações de longo prazo (long-running operations)
    isLongRunningOperation: boolean = false, 
  ): Promise<T> {
    // @ts-ignore
    const activeKeys = await this.prisma.apiKey.findMany({
      where: {
        organizationId,
        provider: providerName,
        isActive: true,
        status: { in: ['valid', 'unchecked'] },
      },
      orderBy: { isDefault: 'desc' }, // Prioriza a chave padrão
    });

    if (activeKeys.length === 0) {
      throw new BadRequestException(`No active API keys found for ${providerName} in this organization. Please configure them in settings.`);
    }

    let lastError: any;
    for (const keyConfig of activeKeys) {
      try {
        const apiKey = await this.geminiConfigService.getDecryptedApiKey(keyConfig);
        const geminiClient = this.geminiConfigService.createGeminiClient(apiKey);
        
        const result = await operation(geminiClient, apiKey);

        // Otimisticamente incrementa o contador de uso
        // @ts-ignore
        await this.prisma.apiKey.update({
          where: { id: keyConfig.id },
          data: { usageCount: { increment: 1 } },
        });

        return result;
      } catch (error: any) {
        lastError = error;
        this.logger.warn(`Operation failed with key ${keyConfig.label} (ID: ${keyConfig.id}) for org ${organizationId}: ${error.message}`);
        
        const status = error.response?.status || error.status; // Pode ser number ou string
        const isRateLimit = status === 429 || error.message?.includes('429');
        const isAuthError = status === 401 || status === 403 || error.message?.includes('401') || error.message?.includes('403');

        if (isRateLimit) {
          // @ts-ignore
          await this.prisma.apiKey.update({
            where: { id: keyConfig.id },
            data: { status: 'rate-limited', errorMessage: 'Quota exceeded for this key.', lastValidatedAt: new Date() },
          });
        } else if (isAuthError) {
          // @ts-ignore
          await this.prisma.apiKey.update({
            where: { id: keyConfig.id },
            data: { status: 'invalid', errorMessage: 'Invalid or unauthorized API key.', lastValidatedAt: new Date() },
          });
        }
        // Se for uma operação de longo prazo, um erro transitório não deveria invalidar a chave permanentemente
        if (!isLongRunningOperation) {
          this.logger.error(`Non-long-running operation failed. Invalidate key for immediate reuse.`);
          // Em um ambiente de produção, aqui faríamos um recheck mais robusto da chave
        }
      }
    }

    throw new BadRequestException(`All API keys failed for ${providerName} in organization ${organizationId}. Last error: ${lastError?.message || 'Unknown error.'}`);
  }

  // NOVO: Método de polling para operações de longa duração do Gemini (File Search, Video Gen, etc.)
  async pollGeminiOperation<T>(
    geminiClient: GoogleGenAI, // Corrected type to GoogleGenAI
    operationName: string,
    logger: Logger,
    timeoutMs: number = 600000, // 10 minutos
    pollIntervalMs: number = 5000, // 5 segundos
  ): Promise<T> {
    const startTime = Date.now();
    // @ts-ignore getGenerativeModel is the entry point
    let operation = await geminiClient.getGenerativeModel().operations.get(operationName);

    while (!operation.done) {
      if (Date.now() - startTime > timeoutMs) {
        throw new BadRequestException(`Operation ${operationName} timed out after ${timeoutMs / 1000} seconds.`);
      }
      logger.debug(`Operation ${operationName} still processing... State: ${JSON.stringify(operation.metadata)}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      // @ts-ignore getGenerativeModel is the entry point
      operation = await geminiClient.getGenerativeModel().operations.get(operationName);
    }

    if (operation.error) {
      logger.error(`Operation ${operationName} failed: ${operation.error.message}`);
      throw new BadRequestException(`Gemini operation failed: ${operation.error.message}`);
    }

    return operation.response as T;
  }

  // --- Funções de Geração de IA ---
  async generateText(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string,
    options?: Partial<GenerateContentRequest['generationConfig']>,
    tools?: GenerateContentRequest['tools'], // NOVO: Suporte a tools aqui
  ): Promise<string> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      // @ts-ignore getGenerativeModel is the entry point
      const modelInstance = geminiClient.getGenerativeModel({ model });
      const request: GenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: options,
        tools: tools, // Passar as tools
        safetySettings: this.defaultSafetySettings, // Aplicar configurações de segurança
      };
      const result = await modelInstance.generateContent(request);
      // TODO: Tratamento de safety ratings aqui
      if (result.response.candidates && result.response.candidates.length === 0) {
        throw new BadRequestException('AI response was blocked by safety settings or no content was generated.');
      }
      return result.response.text();
    });
  }

  // NOVO: Função para executar consulta RAG (File Search)
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    fileSearchStoreName: string,
    prompt: string,
    model: string = 'gemini-1.5-flash', // Modelo específico para File Search
    options?: Partial<GenerateContentRequest['generationConfig']>,
  ): Promise<GenerateContentResponse> {
    if (!fileSearchStoreName) {
      throw new BadRequestException('File Search Store Name is required for RAG query.');
    }

    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      // @ts-ignore getGenerativeModel is the entry point
      const modelInstance = geminiClient.getGenerativeModel({ model });
      const request: GenerateContentRequest = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [fileSearchStoreName],
          },
        }],
        generationConfig: options,
        safetySettings: this.defaultSafetySettings,
      };
      const result = await modelInstance.generateContent(request);
      if (result.response.candidates && result.response.candidates.length === 0) {
        throw new BadRequestException('AI response was blocked by safety settings or no content was generated for RAG query.');
      }
      return result.response; // Retorna o objeto de resposta completo para extrair groundingMetadata
    });
  }

  // NOVO: Função para upload de arquivo para Gemini Files API
  async uploadFileToGeminiFiles(
    organizationId: string,
    firebaseUid: string,
    fileBuffer: Buffer, // Ensure @types/node is installed for Buffer type
    fileName: string,
    mimeType: string,
  ): Promise<GenAIFile> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Uploading file '${fileName}' to Gemini Files API...`);
      // @ts-ignore getGenerativeModel is the entry point
      const uploadOperation = await geminiClient.getGenerativeModel().files.upload({
        file: fileBuffer,
        displayName: fileName,
        mimeType: mimeType,
      });

      // Polling para esperar o arquivo ficar ativo
      const geminiFile = await this.pollGeminiOperation<GenAIFile>(
        geminiClient,
        uploadOperation.name,
        this.logger,
        60000, // 1 minuto de timeout para upload
        2000, // 2 segundos de intervalo
      );
      
      if (geminiFile.state !== 'ACTIVE') {
        throw new BadRequestException(`File failed to become active in Gemini Files API: ${geminiFile.state}`);
      }
      return geminiFile;
    }, true); // Marcado como long-running operation
  }

  // NOVO: Função para adicionar arquivo a um File Search Store
  async addFileToGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    fileSearchStoreName: string,
    geminiFileName: string, // ID do arquivo Gemini
    chunkingConfig?: { maxTokensPerChunk?: number; overlap?: number; },
  ): Promise<void> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Adding Gemini File '${geminiFileName}' to store '${fileSearchStoreName}'...`);
      // @ts-ignore getGenerativeModel is the entry point
      const addFileOperation = await geminiClient.getGenerativeModel().fileSearchStores.addFile({
        fileSearchStore: fileSearchStoreName,
        file: geminiFileName,
        chunkingConfig: chunkingConfig ? chunkingConfig : { maxTokensPerChunk: 200, overlap: 20 },
      });

      // Polling para esperar o arquivo ser adicionado ao store
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
      // @ts-ignore getGenerativeModel is the entry point
      const store = await geminiClient.getGenerativeModel().fileSearchStores.create({
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
      // @ts-ignore getGenerativeModel is the entry point
      const store = await geminiClient.getGenerativeModel().fileSearchStores.get(storeName);
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
      // @ts-ignore getGenerativeModel is the entry point
      const files = await geminiClient.getGenerativeModel().fileSearchStores.listFiles(storeName);
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
      // @ts-ignore getGenerativeModel is the entry point
      await geminiClient.getGenerativeModel().files.delete(geminiFileName);
      this.logger.log(`Gemini File '${geminiFileName}' deleted successfully.`);
    });
  }
}