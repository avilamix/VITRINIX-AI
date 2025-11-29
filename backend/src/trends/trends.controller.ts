import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TrendsService } from './trends.service';
import { CreateTrendDto } from './dto/create-trend.dto';
import { UpdateTrendDto } from './dto/update-trend.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { TrendResponseDto } from './dto/trend-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Trends')
@Controller('organizations/:organizationId/trends')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class TrendsController {
  constructor(private readonly trendsService: TrendsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new trend for the organization' })
  @ApiResponse({ status: 201, description: 'The trend has been successfully created.', type: TrendResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createTrendDto: CreateTrendDto,
  ): Promise<TrendResponseDto> {
    return this.trendsService.create(organizationId, firebaseUid, createTrendDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all trends for the organization' })
  @ApiResponse({ status: 200, description: 'List of trends.', type: [TrendResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<TrendResponseDto[]> {
    return this.trendsService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get a trend by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The trend details.', type: TrendResponseDto })
  @ApiResponse({ status: 404, description: 'Trend not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TrendResponseDto> {
    return this.trendsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a trend by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The trend has been successfully updated.', type: TrendResponseDto })
  @ApiResponse({ status: 404, description: 'Trend not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTrendDto: UpdateTrendDto,
  ): Promise<TrendResponseDto> {
    return this.trendsService.update(organizationId, id, updateTrendDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trend by ID for the organization' })
  @ApiResponse({ status: 204, description: 'The trend has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Trend not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.trendsService.remove(organizationId, id);
  }
}
