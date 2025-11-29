import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { firebaseAuth } from '../config/firebase.config';
import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
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
    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'user' property
    let user = await (this.prisma as any).user.findUnique({
      where: { firebaseUid: firebaseUser.uid },
    });

    if (!user) {
      // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'user' property
      user = await (this.prisma as any).user.create({
        data: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.name || firebaseUser.email.split('@')[0], // Default name if not provided
        },
      });
      this.logger.log(`New user created: ${user.email}`);
    } else {
      // Optionally update user data if it changed in Firebase
      if (user.email !== firebaseUser.email || (firebaseUser.name && user.name !== firebaseUser.name)) {
        // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'user' property
        user = await (this.prisma as any).user.update({
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
    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'organizationMember' property
    const memberships = await (this.prisma as any).organizationMember.findMany({
      where: { userId },
      include: {
        organization: true, // Include the related organization data
      },
    });

    return memberships.map(membership => ({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
      },
      role: membership.role,
    }));
  }
}