

import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client'; // Importe Role

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Explicitly declare properties to satisfy Typescript when client generation is missing/incomplete in this context
  public user: any;
  public organization: any;
  public organizationMember: any;
  public apiKey: any;
  public file: any;
  public Role = Role;

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    // @ts-ignore
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}