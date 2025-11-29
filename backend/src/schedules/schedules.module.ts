import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesModule } from '../files/files.module'; // Necessário para validar contentId contra LibraryItems

@Module({
  imports: [PrismaModule, AuthModule, PermissionsModule, FilesModule],
  providers: [SchedulesService],
  controllers: [SchedulesController],
  exports: [SchedulesService]
})
export class SchedulesModule {}
