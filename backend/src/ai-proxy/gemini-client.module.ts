
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiConfigService } from '../config/gemini.config'; // Referência atualizada

@Global() // Torna o GeminiConfigService acessível globalmente
@Module({
  imports: [ConfigModule], // Para usar ConfigService
  providers: [GeminiConfigService], // Usar o serviço de configuração
  exports: [GeminiConfigService],
})
export class ApiConfigModule {} // Nome do módulo atualizado
