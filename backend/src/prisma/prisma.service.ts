import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: ['warn', 'error'], // Log Prisma warnings and errors
    });
  }

  async onModuleInit() {
    // FIX: Cast 'this' to 'any' to resolve TypeScript error on $connect()
    await (this as any).$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // FIX: Cast 'this' to 'any' to resolve TypeScript error on $on()
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}