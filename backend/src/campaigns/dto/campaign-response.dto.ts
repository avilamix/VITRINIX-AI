import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional, IsObject, IsArray } from 'class-validator';

export class CampaignResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Lançamento de Produto X' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'product_launch' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'https://example.com/campaign-video.mp4', nullable: true })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 'Semana 1: Teaser, Semana 2: Lançamento Completo' })
  @IsString()
  timeline: string;

  @ApiProperty({ type: 'object', isArray: true, example: [{ contentText: 'Teaser post', keywords: ['promo'] }], nullable: true })
  @IsOptional()
  generatedPosts?: any; // JSON type in Prisma maps to any/object here

  @ApiProperty({ type: 'object', isArray: true, example: [{ platform: 'Instagram', headline: 'New Product' }], nullable: true })
  @IsOptional()
  generatedAds?: any; // JSON type in Prisma maps to any/object here

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2023-10-27T10:30:00.000Z' })
  @IsDate()
  updatedAt: Date;
}
