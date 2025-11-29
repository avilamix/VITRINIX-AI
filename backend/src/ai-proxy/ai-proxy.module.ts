import { Module } from '@nestjs/common';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { GeminiClientModule } from './gemini-client.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule para AuthService no KnowledgeBaseService

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    GeminiClientModule,
    PermissionsModule,
    AuthModule, // Adicionado para acesso a AuthService em outros módulos que usam ai-proxy
  ],
  controllers: [AiProxyController],
  providers: [AiProxyService],
  exports: [AiProxyService], // EXPORTAR AiProxyService para ser usado no KnowledgeBaseService
})
export class AiProxyModule {}
