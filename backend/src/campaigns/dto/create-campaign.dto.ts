import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray, IsObject } from 'class-validator';

// Estruturas simplificadas para posts e ads dentro da campanha
class GeneratedPostItemDto {
  @IsString()
  contentText: string;
  @IsArray()
  @IsString({ each: true })
  keywords: string[];
}

class GeneratedAdItemDto {
  @IsString()
  platform: string;
  @IsString()
  headline: string;
  @IsString()
  copy: string;
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Lançamento de Produto X', description: 'Nome da campanha.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'product_launch', description: 'Tipo da campanha (ex: product_launch, engagement).' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @ApiProperty({ example: 'https://example.com/campaign-video.mp4', required: false, description: 'URL de um vídeo promocional da campanha.' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 'Semana 1: Teaser, Semana 2: Lançamento Completo', description: 'Linha do tempo cronológica da campanha.' })
  @IsString()
  @IsNotEmpty()
  timeline: string;

  @ApiProperty({ type: [GeneratedPostItemDto], required: false, description: 'Lista de posts gerados para a campanha.' })
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  generatedPosts?: GeneratedPostItemDto[];

  @ApiProperty({ type: [GeneratedAdItemDto], required: false, description: 'Lista de anúncios gerados para a campanha.' })
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  generatedAds?: GeneratedAdItemDto[];
}
