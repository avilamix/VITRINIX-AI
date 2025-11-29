import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Campaigns')
@Controller('organizations/:organizationId/campaigns')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new campaign for the organization' })
  @ApiResponse({ status: 201, description: 'The campaign has been successfully created.', type: CampaignResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.create(organizationId, firebaseUid, createCampaignDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all campaigns for the organization' })
  @ApiResponse({ status: 200, description: 'List of campaigns.', type: [CampaignResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get a campaign by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The campaign details.', type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a campaign by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The campaign has been successfully updated.', type: CampaignResponseDto })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(organizationId, id, updateCampaignDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campaign by ID for the organization' })
  @ApiResponse({ status: 204, description: 'The campaign has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.campaignsService.remove(organizationId, id);
  }
}
