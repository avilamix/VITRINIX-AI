
import { Controller, Post, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('API Keys')
@Controller('organizations/:organizationId/api-keys')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a new API key for a specific provider to an organization' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeysService.createApiKey(organizationId, firebaseUid, createApiKeyDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'List all API keys for an organization' })
  async findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<ApiKeyResponseDto[]> {
    return this.apiKeysService.getApiKeysForOrganization(organizationId);
  }
}
