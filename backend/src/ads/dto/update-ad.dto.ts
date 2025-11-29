import { PartialType } from '@nestjs/swagger';
import { CreateAdDto, AD_PLATFORMS } from './create-ad.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @ApiProperty({ example: 'Facebook', enum: AD_PLATFORMS, required: false, description: 'Nova plataforma de anúncio.' })
  @IsString()
  @IsOptional()
  @IsIn(AD_PLATFORMS)
  platform?: string;

  @ApiProperty({ example: 'Impulsione Suas Vendas Online!', required: false, description: 'Nova manchete do anúncio.' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  headline?: string;

  @ApiProperty({ example: 'Nossa ferramenta de IA revoluciona o marketing digital, entregando resultados visíveis.', required: false, description: 'Novo corpo do texto do anúncio.' })
  @IsString()
  @IsOptional()
  copy?: string;

  @ApiProperty({ example: 'https://example.com/new-creative.mp4', required: false, description: 'Nova URL do criativo do anúncio.' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;
}
