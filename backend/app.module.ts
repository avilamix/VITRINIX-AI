
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiConfigModule } from './ai-proxy/gemini-client.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AiProxyModule } from './ai-proxy/ai-proxy.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserThrottlerGuard } from './auth/guards/user-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 20,
      },
    ]),
    CacheModule.register({ // Habilita o cache globalmente
      isGlobal: true,
      ttl: 60 * 5, // 5 minutos de TTL padrão
    }),
    AuthModule,
    PrismaModule,
    OrganizationsModule,
    ApiKeysModule,
    ApiConfigModule,
    AiProxyModule,
    PermissionsModule,
    KnowledgeBaseModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
  ],
})
export class AppModule {}
