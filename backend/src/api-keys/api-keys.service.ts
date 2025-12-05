
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { ModelProvider, ApiKeyStatus } from '@prisma/client';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class ApiKeysService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async createApiKey(organizationId: string, firebaseUid: string, dto: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);

    // TODO: A more robust encryption mechanism should be used here (e.g., KMS)
    const encryptedKey = dto.key; // For now, storing as is.

    const newKey = await this.prisma.apiKey.create({
      data: {
        organizationId,
        addedByUserId: user.id,
        provider: dto.provider,
        displayName: dto.displayName,
        encryptedKey: encryptedKey,
        isDefault: dto.isDefault || false,
        status: ApiKeyStatus.unchecked,
      },
    });

    return this.mapToDto(newKey);
  }

  async getApiKeysForOrganization(organizationId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { organizationId },
    });
    return keys.map(this.mapToDto);
  }

  async getBestApiKeyConfig(organizationId: string, provider: ModelProvider): Promise<any> {
    const key = await this.prisma.apiKey.findFirst({
        where: {
            organizationId,
            provider,
            isActive: true,
            status: { in: ['valid', 'unchecked'] },
        },
        orderBy: {
            isDefault: 'desc',
        },
    });
    if (!key) throw new NotFoundException(`No valid API key found for ${provider} in this organization.`);
    return key;
  }
  
  private mapToDto(key: any): ApiKeyResponseDto {
    return {
      id: key.id,
      displayName: key.displayName,
      provider: key.provider,
      isDefault: key.isDefault,
      isActive: key.isActive,
      status: key.status,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
    };
  }
}
