

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
    // FIX: Remove @ts-ignore. $connect should be available when extending PrismaClient.
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // FIX: Remove @ts-ignore. $on should be available when extending PrismaClient.
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}