

import { Injectable, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { firebaseAuth } from '../config/firebase.config';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { DecodedIdToken } from 'firebase-admin/auth';
import { OrganizationMembershipDto } from './dto/organization-membership.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private prisma: PrismaService) {}

  async validateFirebaseToken(idToken: string): Promise<DecodedIdToken> {
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      this.logger.error(`Firebase token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Firebase ID token');
    }
  }

  async findOrCreateUser(firebaseUser: DecodedIdToken): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0],
        },
      });
      this.logger.log(`New user created: ${user.email}`);
    } else {
      if (user.email !== firebaseUser.email || (firebaseUser.name && user.name !== firebaseUser.name)) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            email: firebaseUser.email,
            name: firebaseUser.name || user.name,
          },
        });
        this.logger.log(`User updated: ${user.email}`);
      }
    }
    return user;
  }

  async getUserOrganizations(userId: string): Promise<OrganizationMembershipDto[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    return memberships.map(membership => ({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        fileSearchStoreName: membership.organization.fileSearchStoreName, // Incluir no DTO
      },
      role: membership.role,
    }));
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }
    return user;
  }
}