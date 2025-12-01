
import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from '@google/genai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKey } from '@prisma/client';

@Injectable()
export class GeminiConfigService {
  private readonly logger = new Logger(GeminiConfigService.name);

  constructor(private configService: ConfigService) {}

  // Configurações padrão para geração de conteúdo
  readonly DEFAULT_GENERATION_CONFIG = {
    model: 'gemini-2.5-flash', // Updated to 2.5-flash per documentation
    temperature: 0.7,
    topP: 0.95,
    maxOutputTokens: 1024,
  };

  // Configurações de segurança padrão para geração de conteúdo
  readonly DEFAULT_SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  // Cria uma instância do cliente Gemini com uma chave específica
  createGeminiClient(apiKey: string): GoogleGenAI {
    if (!apiKey) {
      this.logger.error('Attempted to create Gemini client with empty API key.');
      throw new Error('Gemini API Key is missing.');
    }
    return new GoogleGenAI({ apiKey });
  }

  // TODO: Em um ambiente real, esta função buscaria chaves criptografadas de um KMS
  // e as descriptografaria. Por agora, ela apenas retorna a chave fornecida.
  async getDecryptedApiKey(apiKeyConfig: ApiKey): Promise<string> {
    // Exemplo de como a descriptografia seria feita em um ambiente real
    // const kmsService = new KMS(this.configService.get('KMS_KEY_ID'));
    // return kmsService.decrypt(apiKeyConfig.encryptedKey);
    return apiKeyConfig.encryptedKey; 
  }
}
