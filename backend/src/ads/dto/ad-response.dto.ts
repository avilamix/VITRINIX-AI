import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate } from 'class-validator';
import { AD_PLATFORMS } from './create-ad.dto';

export class AdResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Instagram', enum: AD_PLATFORMS })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'Venda Mais com Nossa Nova Ferramenta!' })
  @IsString()
  headline: string;

  @ApiProperty({ example: 'Descubra como nossa IA pode otimizar suas campanhas e gerar resultados surpreendentes.' })
  @IsString()
  copy: string;

  @ApiProperty({ example: 'https://example.com/ad-creative.jpg', nullable: true })
  @IsString()
  mediaUrl?: string;

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2023-10-27T10:30:00.000Z' })
  @IsDate()
  updatedAt: Date;
}
