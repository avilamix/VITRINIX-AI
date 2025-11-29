import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make PrismaService available globally
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export PrismaService for use in other modules
})
export class PrismaModule {}
