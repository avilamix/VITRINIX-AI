import { PartialType } from '@nestjs/swagger';
import { CreateTrendDto } from './create-trend.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, IsUrl, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class SourceDto {
  @ApiProperty({ example: 'https://example.com/source', description: 'URI da fonte.' })
  @IsUrl()
  @IsNotEmpty()
  uri: string;

  @ApiProperty({ example: 'Título da Fonte', required: false, description: 'Título da fonte.' })
  @IsString()
  @IsOptional()
  title?: string;
}

export class UpdateTrendDto extends PartialType(CreateTrendDto) {
  @ApiProperty({ example: 'Tendências Emergentes em IA', required: false, description: 'Nova query ou tópico da tendência.' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ example: 92, required: false, description: 'Nova pontuação de viralidade.' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiProperty({ example: 'Foco em personalização extrema e automação com IA.', required: false, description: 'Novos dados resumidos da tendência.' })
  @IsString()
  @IsOptional()
  data?: string;

  @ApiProperty({ type: [SourceDto], required: false, description: 'Novas fontes da tendência.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  @IsOptional()
  sources?: SourceDto[];
}