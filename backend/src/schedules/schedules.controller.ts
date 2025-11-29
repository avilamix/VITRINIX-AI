import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { ScheduleEntryResponseDto } from './dto/schedule-entry-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Schedules')
@Controller('organizations/:organizationId/schedules')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new schedule entry for the organization' })
  @ApiResponse({ status: 201, description: 'The schedule entry has been successfully created.', type: ScheduleEntryResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createScheduleEntryDto: CreateScheduleEntryDto,
  ): Promise<ScheduleEntryResponseDto> {
    return this.schedulesService.create(organizationId, firebaseUid, createScheduleEntryDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all schedule entries for the organization' })
  @ApiResponse({ status: 200, description: 'List of schedule entries.', type: [ScheduleEntryResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<ScheduleEntryResponseDto[]> {
    return this.schedulesService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get a schedule entry by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The schedule entry details.', type: ScheduleEntryResponseDto })
  @ApiResponse({ status: 404, description: 'Schedule entry not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ScheduleEntryResponseDto> {
    return this.schedulesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a schedule entry by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The schedule entry has been successfully updated.', type: ScheduleEntryResponseDto })
  @ApiResponse({ status: 404, description: 'Schedule entry not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScheduleEntryDto: UpdateScheduleEntryDto,
  ): Promise<ScheduleEntryResponseDto> {
    return this.schedulesService.update(organizationId, id, updateScheduleEntryDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule entry by ID for the organization' })
  @ApiResponse({ status: 204, description: 'The schedule entry has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Schedule entry not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.schedulesService.remove(organizationId, id);
  }
}
