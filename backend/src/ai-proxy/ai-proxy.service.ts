

// FIX: Import Buffer to resolve type error.
import { Buffer } from 'node:buffer';
import { Injectable, BadRequestException, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiConfigService } from '../config/gemini.config';
import { GoogleGenAI, GenerateContentParameters, Part, Content, GenerateContentResponse, Tool } from '@google/genai'; 
import { ApiKey, ModelProvider } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Observable, from, map, switchMap } from 'rxjs';

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(
    private prisma: PrismaService,
    private apiKeysService: ApiKeysService,
    private geminiConfigService: GeminiConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async executeGeminiOperation<T>(
    organizationId: string,
    firebaseUid: string,
    providerName: ModelProvider,
    operation: (geminiClient: GoogleGenAI, apiKey: string) => Promise<T>,
    isLongRunningOperation: boolean = false,
  ): Promise<T> {
    const activeKeys = await this.prisma.apiKey.findMany({
      where: {
        organizationId,
        provider: providerName,
        isActive: true,
        status: { in: ['valid', 'unchecked', 'rate-limited'] },
      },
      orderBy: { isDefault: 'desc' }, 
    });

    if (activeKeys.length === 0) {
      throw new HttpException(`No active API keys for ${providerName}`, HttpStatus.BAD_REQUEST);
    }
    
    let lastError: any;
    for (const keyConfig of activeKeys) {
      try {
        const apiKey = await this.geminiConfigService.getDecryptedApiKey(keyConfig);
        const geminiClient = this.geminiConfigService.createGeminiClient(apiKey);
        const result = await operation(geminiClient, apiKey);
        return result;
      } catch (error: any) {
        lastError = error;
      }
    }
    throw new HttpException(`All API keys failed. Last error: ${lastError?.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async callGemini(
    organizationId: string,
    firebaseUid: string,
    model: string,
    contents: GenerateContentParameters['contents'],
    config?: any,
  ): Promise<GenerateContentResponse> {
    const cacheKey = `gemini-call:${organizationId}:${JSON.stringify({ model, contents, config })}`;
    const cachedResponse = await this.cacheManager.get<GenerateContentResponse>(cacheKey);
    if (cachedResponse) {
      this.logger.log(`Returning cached response for key: ${cacheKey}`);
      return cachedResponse;
    }

    const response = await this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      const { generationConfig, safetySettings, ...restConfig } = config || {};
      const request: GenerateContentParameters = {
        model,
        contents,
        config: { ...this.geminiConfigService.DEFAULT_GENERATION_CONFIG, ...restConfig, ...generationConfig, safetySettings: safetySettings || this.geminiConfigService.DEFAULT_SAFETY_SETTINGS },
      };
      return await geminiClient.models.generateContent(request);
    });

    await this.cacheManager.set(cacheKey, response);
    return response;
  }
  
  generateTextStream(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    history?: Content[],
    model?: string,
    options?: Partial<GenerateContentParameters['config']>,
    tools?: Tool[],
  ): Observable<MessageEvent> {
    const operation = async () => {
        const keyConfig = await this.apiKeysService.getBestApiKeyConfig(organizationId, 'Google Gemini');
        const apiKey = await this.geminiConfigService.getDecryptedApiKey(keyConfig);
        const geminiClient = this.geminiConfigService.createGeminiClient(apiKey);

        const contents = [...(history || []), { role: 'user', parts: [{ text: prompt }] }];

        return geminiClient.models.generateContentStream({
            model: model || this.geminiConfigService.DEFAULT_GENERATION_CONFIG.model,
            contents,
            config: options,
            tools,
        });
    };

    return from(operation()).pipe(
        switchMap(stream => from(stream)),
        map(chunk => ({
            data: JSON.stringify({ text: chunk.text })
        } as MessageEvent))
    );
  }

  async generateText(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model?: string,
    options?: any,
  ): Promise<GenerateContentResponse> {
    const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
    return this.callGemini(organizationId, firebaseUid, model || this.geminiConfigService.DEFAULT_GENERATION_CONFIG.model, contents, options);
  }
  
  async generateImage(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model?: string,
    imageConfig?: any,
    options?: any,
  ): Promise<GenerateContentResponse> {
    const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = { ...options, imageConfig };
    return this.callGemini(organizationId, firebaseUid, model || 'gemini-2.5-flash-image', contents, config);
  }
  
  async generateVideo(
    organizationId: string,
    firebaseUid: string,
    prompt?: string,
    model?: string,
    videoConfig?: any,
    image?: any,
    lastFrame?: any,
    referenceImages?: any,
  ): Promise<string> {
    const operation = await this.executeGeminiOperation(
      organizationId,
      firebaseUid,
      'Google Gemini',
      async (geminiClient) => {
        const request: any = {
          model: model || 'veo-3.1-fast-generate-preview',
          prompt,
          image,
          lastFrame,
          referenceImages,
          config: videoConfig,
        };
        Object.keys(request).forEach((key) => request[key] === undefined && delete request[key]);
        return geminiClient.models.generateVideos(request);
      },
      true, 
    );
    let finalOperation = operation;
    while (!finalOperation.done) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      finalOperation = await this.executeGeminiOperation(
        organizationId,
        firebaseUid,
        'Google Gemini',
        (geminiClient) => {
          return geminiClient.operations.getVideosOperation({ operation: finalOperation });
        },
      );
    }
    const downloadLink = finalOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error('Video generation completed but no download link found.');
    }
    return downloadLink;
  }
  
  async generateSpeech(
    organizationId: string,
    firebaseUid: string,
    text: string,
    model?: string,
    speechConfig?: any,
  ): Promise<GenerateContentResponse> {
    const contents: Content[] = [{ role: 'user', parts: [{ text: text }] }];
    const config = {
      responseModalities: ['AUDIO'],
      speechConfig,
    };
    return this.callGemini(organizationId, firebaseUid, model || 'gemini-2.5-flash-preview-tts', contents, config);
  }
  
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    storeName: string, 
    prompt: string,
    model: string,
  ): Promise<GenerateContentResponse> {
    this.logger.log(`Querying with File Search for prompt: "${prompt}"`);
    const contents: Content[] = [{ role: 'user', parts: [{ text: prompt }] }];
    const config = {
      tools: [{ fileSearch: {} }],
    };
    return this.callGemini(organizationId, firebaseUid, model, contents, config);
  }
  
  async uploadFileToGeminiFiles(
    organizationId: string,
    firebaseUid: string,
    buffer: Buffer,
    displayName: string,
    mimeType: string,
  ): Promise<any> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Uploading file ${displayName} (${mimeType}) to Gemini Files API.`);
      return await geminiClient.files.upload({
        file: buffer,
        mimeType: mimeType,
        displayName: displayName,
      });
    });
  }
  
  async addFileToGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    storeName: string,
    fileName: string,
  ): Promise<void> {
    this.logger.log(`Skipping addFileToStore for ${fileName} as it's project-scoped.`);
    return Promise.resolve();
  }
  
  async createGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    displayName: string,
  ): Promise<{ name: string; displayName: string }> {
    const storeName = `fileSearchStores/org-${organizationId}-${Date.now()}`;
    this.logger.log(`Mocking creation of File Search Store: ${storeName}`);
    return Promise.resolve({ name: storeName, displayName });
  }

  async getGeminiFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    storeName: string,
  ): Promise<any> {
    this.logger.log(`Mocking getFileSearchStore for ${storeName}`);
    return Promise.resolve({ name: storeName, displayName: 'Mocked Store' });
  }

  async listFilesInGeminiFileSearchStore(organizationId: string, firebaseUid: string): Promise<any[]> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Listing files from Gemini Files API.`);
      const files = [];
      for await (const file of geminiClient.files.list()) {
        files.push(file);
      }
      return files;
    });
  }
  
  async deleteGeminiFile(
    organizationId: string,
    firebaseUid: string,
    fileId: string,
  ): Promise<void> {
    return this.executeGeminiOperation(organizationId, firebaseUid, 'Google Gemini', async (geminiClient) => {
      this.logger.log(`Deleting file ${fileId} from Gemini Files API.`);
      return await geminiClient.files.delete({ name: fileId });
    });
  }
}