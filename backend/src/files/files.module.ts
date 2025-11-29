import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { GoogleCloudStorageService } from './google-cloud-storage.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PermissionsModule,
    ConfigModule, // Necessário para ConfigService (variáveis de ambiente)
    MulterModule.register(), // Para manipulação de upload de arquivos
  ],
  providers: [FilesService, GoogleCloudStorageService],
  controllers: [FilesController],
  exports: [FilesService, GoogleCloudStorageService] // Exportar para uso em outros módulos (ex: Schedule)
})
export class FilesModule {}
