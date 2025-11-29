
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from '../prisma/prisma.module'; // Ensure PrismaModule is imported

@Module({
  imports: [PrismaModule], // AuthModule depends on Prisma for user operations
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService], // Export AuthService if other modules need to use its methods directly
})
export class AuthModule {}
