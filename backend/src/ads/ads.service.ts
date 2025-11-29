import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AdResponseDto } from './dto/ad-response.dto';

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(organizationId: string, firebaseUid: string, createAdDto: CreateAdDto): Promise<AdResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Access 'ad' model via this.prisma.ad
    const ad = await this.prisma.ad.create({
      data: {
        organizationId,
        userId: user.id,
        platform: createAdDto.platform,
        headline: createAdDto.headline,
        copy: createAdDto.copy,
        mediaUrl: createAdDto.mediaUrl,
      },
    });
    return this.mapToResponseDto(ad);
  }

  async findAll(organizationId: string): Promise<AdResponseDto[]> {
    // FIX: Access 'ad' model via this.prisma.ad
    const ads = await this.prisma.ad.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return ads.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<AdResponseDto> {
    // FIX: Access 'ad' model via this.prisma.ad
    const ad = await this.prisma.ad.findUnique({
      where: { id, organizationId },
    });
    if (!ad) {
      throw new NotFoundException(`Ad with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(ad);
  }

  async update(organizationId: string, id: string, updateAdDto: UpdateAdDto): Promise<AdResponseDto> {
    await this.findOne(organizationId, id); // Check if ad exists

    // FIX: Access 'ad' model via this.prisma.ad
    const ad = await this.prisma.ad.update({
      where: { id, organizationId },
      data: {
        platform: updateAdDto.platform,
        headline: updateAdDto.headline,
        copy: updateAdDto.copy,
        mediaUrl: updateAdDto.mediaUrl,
      },
    });
    return this.mapToResponseDto(ad);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id); // Check if ad exists

    // FIX: Access 'ad' model via this.prisma.ad
    await this.prisma.ad.delete({
      where: { id, organizationId },
    });
  }

  private mapToResponseDto(ad: any): AdResponseDto {
    return {
      id: ad.id,
      organizationId: ad.organizationId,
      userId: ad.userId,
      platform: ad.platform,
      headline: ad.headline,
      copy: ad.copy,
      mediaUrl: ad.mediaUrl,
      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt,
    };
  }
}