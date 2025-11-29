import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export const AD_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'Google', 'Pinterest'];

export class CreateAdDto {
  @ApiProperty({ example: 'Instagram', enum: AD_PLATFORMS, description: 'Plataforma de anúncio.' })
  @IsString()
  @IsNotEmpty()
  @IsIn(AD_PLATFORMS)
  platform: string;

  @ApiProperty({ example: 'Venda Mais com Nossa Nova Ferramenta!', description: 'Manchete do anúncio.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  headline: string;

  @ApiProperty({ example: 'Descubra como nossa IA pode otimizar suas campanhas e gerar resultados surpreendentes.', description: 'Corpo do texto do anúncio.' })
  @IsString()
  @IsNotEmpty()
  copy: string;

  @ApiProperty({ example: 'https://example.com/ad-creative.jpg', required: false, description: 'URL do criativo (imagem ou vídeo) do anúncio.' })
  @IsString()
  @IsOptional()
  mediaUrl?: string;
}
