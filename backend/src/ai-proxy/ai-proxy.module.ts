
import { Module } from '@nestjs/common';
import { AiProxyController } from './ai-proxy.controller';
import { AiProxyService } from './ai-proxy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiConfigModule } from './gemini-client.module'; // Renamed import
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthModule } from '../auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler'; // Importar ThrottlerModule para o guard customizado

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    ApiConfigModule, // Renamed module
    PermissionsModule,
    AuthModule,
    ThrottlerModule, // Adicionado para o UserThrottlerGuard
  ],
  controllers: [AiProxyController],
  providers: [AiProxyService],
  exports: [AiProxyService],
})
export class AiProxyModule {}
