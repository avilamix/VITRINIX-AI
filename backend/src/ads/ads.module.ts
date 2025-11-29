import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, AuthModule, PermissionsModule],
  providers: [AdsService],
  controllers: [AdsController],
  exports: [AdsService]
})
export class AdsModule {}
