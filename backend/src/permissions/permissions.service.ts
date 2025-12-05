
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getUserRoleInOrganization(firebaseUid: string, organizationId: string): Promise<Role | null> {
    try {
      const user = await this.authService.getUserByFirebaseUid(firebaseUid);
      
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organizationId,
          },
        },
      });
      
      return membership ? membership.role : null;
    } catch (error) {
      this.logger.warn(`Could not retrieve role for user ${firebaseUid} in org ${organizationId}: ${error.message}`);
      return null;
    }
  }
}
