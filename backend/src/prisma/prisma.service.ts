
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
    // @ts-ignore Property '$connect' does not exist on type 'PrismaService'.
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore Property '$on' does not exist on type 'PrismaService'.
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}