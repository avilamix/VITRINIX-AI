

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { Role } from '@prisma/client';
import { OrganizationMembershipDto } from '../auth/dto/organization-membership.dto';
import { AuthService } from '../auth/auth.service'; // Importar AuthService

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService, // Injetar AuthService
  ) {}

  async createOrganization(firebaseUid: string, dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.name,
        members: {
          create: {
            userId: user.id,
            role: this.prisma.Role.ADMIN, // Creator is always an ADMIN
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
      fileSearchStoreName: organization.fileSearchStoreName, // Incluir no DTO
    };
  }

  async getUserOrganizations(firebaseUid: string): Promise<OrganizationMembershipDto[]> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id },
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

  // NOVO: Método para atualizar o File Search Store Name da organização
  async updateOrganizationFileSearchStoreName(organizationId: string, storeName: string): Promise<void> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { fileSearchStoreName: storeName },
    });
  }

  // NOVO: Método para buscar organização por ID
  async getOrganizationById(organizationId: string): Promise<any> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        fileSearchStoreName: true,
      },
    });
    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found.`);
    }
    return organization;
  }
}