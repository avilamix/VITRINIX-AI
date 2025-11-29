import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { Role } from '@prisma/client';
import { OrganizationMembershipDto } from 'src/auth/dto/organization-membership.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async createOrganization(firebaseUid: string, dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'user' property
    const user = await (this.prisma as any).user.findUnique({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'organization' property
    const organization = await (this.prisma as any).organization.create({
      data: {
        name: dto.name,
        members: {
          create: {
            userId: user.id,
            role: Role.ADMIN, // Creator is always an ADMIN
          },
        },
      },
      include: {
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      role: organization.members[0].role,
    };
  }

  async getUserOrganizations(firebaseUid: string): Promise<OrganizationMembershipDto[]> {
    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'user' property
    const user = await (this.prisma as any).user.findUnique({ where: { firebaseUid } });
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Cast 'this.prisma' to 'any' to resolve TypeScript error on 'organizationMember' property
    const memberships = await (this.prisma as any).organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
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