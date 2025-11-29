import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'; // Adicionar APP_INTERCEPTOR

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { ApiConfigModule } from './ai-proxy/gemini-client.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';
import { AiProxyModule } from './ai-proxy/ai-proxy.module';
import { PermissionsModule } from './permissions/permissions.module';
import { UserThrottlerGuard } from './auth/guards/user-throttler.guard';
import { ErrorsInterceptor } from './common/interceptors/errors.interceptor'; // Importar ErrorsInterceptor

// Novos Módulos
import { PostsModule } from './posts/posts.module';
import { AdsModule } from './ads/ads.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { TrendsModule } from './trends/trends.module';
import { FilesModule } from './files/files.module'; // Para LibraryItems e Cloud Storage
import { SchedulesModule } from './schedules/schedules.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 segundos
        limit: 20,  // 20 requisições por IP ou por usuário (com guard customizado)
      },
    ]),
    AuthModule,
    PrismaModule,
    OrganizationsModule,
    ApiKeysModule,
    ApiConfigModule,
    AiProxyModule,
    PermissionsModule,
    KnowledgeBaseModule,
    // Novos Módulos de Persistência
    PostsModule,
    AdsModule,
    CampaignsModule,
    TrendsModule,
    FilesModule, // Gerencia LibraryItems e uploads de arquivos
    SchedulesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
    { // Aplicar o ErrorsInterceptor globalmente
      provide: APP_INTERCEPTOR,
      useClass: ErrorsInterceptor,
    },
  ],
})
export class AppModule {}