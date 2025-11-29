
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client'; // Importe Role

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Exponha o enum Role diretamente
  // public readonly Role = Role; // This is automatically available on 'this'

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    // FIX: $connect is a method of the extended PrismaClient, accessible via 'this'
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // FIX: $on is a method of the extended PrismaClient, accessible via 'this'
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}