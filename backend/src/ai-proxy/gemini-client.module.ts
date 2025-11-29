import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeminiConfigService } from '../config/gemini.config';

@Global() // Torna o GeminiConfigService acessível globalmente
@Module({
  imports: [ConfigModule], // Para usar ConfigService
  providers: [GeminiConfigService],
  exports: [GeminiConfigService],
})
export class GeminiClientModule {}
