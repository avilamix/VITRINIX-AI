import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'; // NOVO: ThrottlerModule
import { APP_GUARD } from '@nestjs/core'; // NOVO: APP_GUARD para Throttler

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApiKeysModule } from './api-keys/api-keys.module'; // NOVO: Módulo de chaves de API
import { GeminiClientModule } from './ai-proxy/gemini-client.module'; // NOVO: Módulo para cliente Gemini
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module'; // NOVO: Módulo RAG
import { AiProxyModule } from './ai-proxy/ai-proxy.module'; // NOVO: AiProxyModule
import { PermissionsModule } from './permissions/permissions.module'; // NOVO: PermissionsModule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([ // NOVO: Configuração de Rate Limit
      {
        ttl: 60000, // 60 segundos
        limit: 20,  // 20 requisições por IP
      },
    ]),
    AuthModule,
    PrismaModule,
    OrganizationsModule,
    ApiKeysModule, // NOVO
    GeminiClientModule, // NOVO
    AiProxyModule,      // NOVO
    PermissionsModule,  // NOVO
    KnowledgeBaseModule, // NOVO
  ],
  controllers: [],
  providers: [
    { // NOVO: Aplica o ThrottlerGuard globalmente
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
