import { Controller, Post, Get, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationMembershipDto } from 'src/auth/dto/organization-membership.dto';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth('firebase-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new organization and assign the current user as an ADMIN' })
  @ApiResponse({ status: 201, description: 'Organization successfully created.', type: OrganizationResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.createOrganization(firebaseUid, createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations that the current user is a member of' })
  @ApiResponse({ status: 200, description: 'List of organizations.', type: [OrganizationMembershipDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<OrganizationMembershipDto[]> {
    return this.organizationsService.getUserOrganizations(firebaseUid);
  }
}
