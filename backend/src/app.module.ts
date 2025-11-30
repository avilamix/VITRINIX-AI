
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler'; // NOVO: ThrottlerModule
import { APP_GUARD } from '@nestjs/core'; // NOVO: APP_GUARD para Throttler

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApiKeysModule } from './api-keys/api-keys.module'; // NOVO: Módulo de chaves de API
import { ApiConfigModule } from './ai-proxy/gemini-client.module'; // NOVO: Módulo para cliente Gemini (Nome atualizado)
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module'; // NOVO: Módulo RAG
import { AiProxyModule } from './ai-proxy/ai-proxy.module'; // NOVO: AiProxyModule
import { PermissionsModule } from './permissions/permissions.module'; // NOVO: PermissionsModule
import { UserThrottlerGuard } from './auth/guards/user-throttler.guard'; // Importar guard customizado

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([ // NOVO: Configuração de Rate Limit
      {
        ttl: 60000, // 60 segundos
        limit: 20,  // 20 requisições por IP ou por usuário (com guard customizado)
      },
    ]),
    AuthModule,
    PrismaModule,
    OrganizationsModule,
    ApiKeysModule, // NOVO
    ApiConfigModule, // NOVO (Nome atualizado)
    AiProxyModule,      // NOVO
    PermissionsModule,  // NOVO
    KnowledgeBaseModule, // NOVO
  ],
  controllers: [],
  providers: [
    { // NOVO: Aplica o UserThrottlerGuard globalmente
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
