import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { CampaignResponseDto } from './dto/campaign-response.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(organizationId: string, firebaseUid: string, createCampaignDto: CreateCampaignDto): Promise<CampaignResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Access 'campaign' model via this.prisma.campaign
    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        userId: user.id,
        name: createCampaignDto.name,
        type: createCampaignDto.type,
        videoUrl: createCampaignDto.videoUrl,
        timeline: createCampaignDto.timeline,
        generatedPosts: createCampaignDto.generatedPosts || undefined, // Prisma handles JSON conversion
        generatedAds: createCampaignDto.generatedAds || undefined,     // Prisma handles JSON conversion
      },
    });
    return this.mapToResponseDto(campaign);
  }

  async findAll(organizationId: string): Promise<CampaignResponseDto[]> {
    // FIX: Access 'campaign' model via this.prisma.campaign
    const campaigns = await this.prisma.campaign.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return campaigns.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<CampaignResponseDto> {
    // FIX: Access 'campaign' model via this.prisma.campaign
    const campaign = await this.prisma.campaign.findUnique({
      where: { id, organizationId },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(campaign);
  }

  async update(organizationId: string, id: string, updateCampaignDto: UpdateCampaignDto): Promise<CampaignResponseDto> {
    await this.findOne(organizationId, id); // Check if campaign exists

    // FIX: Access 'campaign' model via this.prisma.campaign
    const campaign = await this.prisma.campaign.update({
      where: { id, organizationId },
      data: {
        name: updateCampaignDto.name,
        type: updateCampaignDto.type,
        videoUrl: updateCampaignDto.videoUrl,
        timeline: updateCampaignDto.timeline,
        generatedPosts: updateCampaignDto.generatedPosts,
        generatedAds: updateCampaignDto.generatedAds,
      },
    });
    return this.mapToResponseDto(campaign);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id); // Check if campaign exists

    // FIX: Access 'campaign' model via this.prisma.campaign
    await this.prisma.campaign.delete({
      where: { id, organizationId },
    });
  }

  private mapToResponseDto(campaign: any): CampaignResponseDto {
    return {
      id: campaign.id,
      organizationId: campaign.organizationId,
      userId: campaign.userId,
      name: campaign.name,
      type: campaign.type,
      videoUrl: campaign.videoUrl,
      timeline: campaign.timeline,
      generatedPosts: campaign.generatedPosts,
      generatedAds: campaign.generatedAds,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
    };
  }
}