import { PartialType } from '@nestjs/swagger';
import { CreateCampaignDto } from './create-campaign.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsArray, IsObject } from 'class-validator';

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiProperty({ example: 'Lançamento de Produto Y', required: false, description: 'Novo nome da campanha.' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ example: 'seasonal_sale', required: false, description: 'Novo tipo da campanha.' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  type?: string;

  @ApiProperty({ example: 'https://example.com/new-campaign-video.mp4', required: false, description: 'Nova URL do vídeo promocional da campanha.' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiProperty({ example: 'Mês 1: Aquecimento, Mês 2: Vendas', required: false, description: 'Nova linha do tempo da campanha.' })
  @IsString()
  @IsOptional()
  timeline?: string;

  @ApiProperty({ required: false, description: 'Novos posts gerados para a campanha.' })
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  generatedPosts?: any[];

  @ApiProperty({ required: false, description: 'Novos anúncios gerados para a campanha.' })
  @IsArray()
  @IsObject({ each: true })
  @IsOptional()
  generatedAds?: any[];
}
