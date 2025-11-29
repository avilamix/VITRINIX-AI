import { Module } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GeminiClientModule } from '../ai-proxy/gemini-client.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module'; // Para obter dados do usuário
import { AiProxyModule } from '../ai-proxy/ai-proxy.module'; // Importar AiProxyModule para usar AiProxyService
import { MulterModule } from '@nestjs/platform-express'; // Para upload de arquivos

@Module({
  imports: [
    PrismaModule,
    GeminiClientModule,
    ApiKeysModule,
    PermissionsModule,
    AuthModule,
    AiProxyModule, // NOVO
    MulterModule.register(), // Configurado via interceptor em controller
  ],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService], // Exportar para o Chatbot etc. se necessário
})
export class KnowledgeBaseModule {}
