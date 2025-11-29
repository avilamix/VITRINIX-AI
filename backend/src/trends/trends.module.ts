import { Module } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { TrendsController } from './trends.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, AuthModule, PermissionsModule],
  providers: [TrendsService],
  controllers: [TrendsController],
  exports: [TrendsService]
})
export class TrendsModule {}
