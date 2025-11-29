
import { GoogleGenAI } from '@google/genai'; // Corrected import from GoogleGenerativeAI
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKey } from '@prisma/client';

@Injectable()
export class GeminiConfigService {
  private readonly logger = new Logger(GeminiConfigService.name);

  constructor(private configService: ConfigService) {}

  // Cria uma instância do cliente Gemini com uma chave específica
  createGeminiClient(apiKey: string): GoogleGenAI { // Corrected type to GoogleGenAI
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