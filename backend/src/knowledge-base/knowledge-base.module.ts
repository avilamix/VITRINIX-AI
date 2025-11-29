
import { Module } from '@nestjs/common';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiConfigModule } from '../ai-proxy/gemini-client.module'; // Nome do módulo atualizado
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { AiProxyModule } from '../ai-proxy/ai-proxy.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    ApiConfigModule, // Nome do módulo atualizado
    ApiKeysModule,
    PermissionsModule,
    AuthModule,
    AiProxyModule,
    MulterModule.register(),
  ],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
