import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdsService } from './ads.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdResponseDto } from './dto/ad-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Ads')
@Controller('organizations/:organizationId/ads')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ad for the organization' })
  @ApiResponse({ status: 201, description: 'The ad has been successfully created.', type: AdResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createAdDto: CreateAdDto,
  ): Promise<AdResponseDto> {
    return this.adsService.create(organizationId, firebaseUid, createAdDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all ads for the organization' })
  @ApiResponse({ status: 200, description: 'List of ads.', type: [AdResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<AdResponseDto[]> {
    return this.adsService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get an ad by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The ad details.', type: AdResponseDto })
  @ApiResponse({ status: 404, description: 'Ad not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdResponseDto> {
    return this.adsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update an ad by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The ad has been successfully updated.', type: AdResponseDto })
  @ApiResponse({ status: 404, description: 'Ad not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAdDto: UpdateAdDto,
  ): Promise<AdResponseDto> {
    return this.adsService.update(organizationId, id, updateAdDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an ad by ID for the organization' })
  @ApiResponse({ status: 204, description: 'The ad has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Ad not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.adsService.remove(organizationId, id);
  }
}
