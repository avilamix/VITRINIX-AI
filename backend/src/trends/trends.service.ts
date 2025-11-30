
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTrendDto } from './dto/create-trend.dto';
import { UpdateTrendDto } from './dto/update-trend.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TrendResponseDto } from './dto/trend-response.dto';

@Injectable()
export class TrendsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(organizationId: string, firebaseUid: string, createTrendDto: CreateTrendDto): Promise<TrendResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Access 'trend' model via this.prisma.trend
    const trend = await (this.prisma as any).trend.create({
      data: {
        organizationId,
        userId: user.id,
        query: createTrendDto.query,
        score: createTrendDto.score,
        data: createTrendDto.data,
        sources: createTrendDto.sources || undefined, // Prisma handles JSON conversion
      },
    });
    return this.mapToResponseDto(trend);
  }

  async findAll(organizationId: string): Promise<TrendResponseDto[]> {
    // FIX: Access 'trend' model via this.prisma.trend
    const trends = await (this.prisma as any).trend.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return trends.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<TrendResponseDto> {
    // FIX: Access 'trend' model via this.prisma.trend
    const trend = await (this.prisma as any).trend.findUnique({
      where: { id, organizationId },
    });
    if (!trend) {
      throw new NotFoundException(`Trend with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(trend);
  }

  async update(organizationId: string, id: string, updateTrendDto: UpdateTrendDto): Promise<TrendResponseDto> {
    await this.findOne(organizationId, id); // Check if trend exists

    // FIX: Access 'trend' model via this.prisma.trend
    const trend = await (this.prisma as any).trend.update({
      where: { id, organizationId },
      data: {
        query: updateTrendDto.query,
        score: updateTrendDto.score,
        data: updateTrendDto.data,
        sources: updateTrendDto.sources,
      },
    });
    return this.mapToResponseDto(trend);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id); // Check if trend exists

    // FIX: Access 'trend' model via this.prisma.trend
    await (this.prisma as any).trend.delete({
      where: { id, organizationId },
    });
  }

  private mapToResponseDto(trend: any): TrendResponseDto {
    return {
      id: trend.id,
      organizationId: trend.organizationId,
      userId: trend.userId,
      query: trend.query,
      score: trend.score,
      data: trend.data,
      sources: trend.sources,
      createdAt: trend.createdAt,
      updatedAt: trend.updatedAt,
    };
  }
}
