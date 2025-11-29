import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsOptional, IsArray, ValidateNested, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

class SourceResponseItemDto {
  @ApiProperty({ example: 'https://example.com/source' })
  @IsString()
  uri: string;

  @ApiProperty({ example: 'Título da Fonte', required: false })
  @IsString()
  @IsOptional()
  title?: string;
}

export class TrendResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Marketing de Conteúdo para SaaS' })
  @IsString()
  query: string;

  @ApiProperty({ example: 85 })
  @IsNumber()
  score: number;

  @ApiProperty({ example: 'Análise detalhada de como as empresas SaaS estão utilizando o marketing de conteúdo para aquisição de clientes.' })
  @IsString()
  data: string;

  @ApiProperty({ type: [SourceResponseItemDto], nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceResponseItemDto)
  @IsOptional()
  sources?: SourceResponseItemDto[];

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2023-10-27T10:30:00.000Z' })
  @IsDate()
  updatedAt: Date;
}
