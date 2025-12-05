
import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
