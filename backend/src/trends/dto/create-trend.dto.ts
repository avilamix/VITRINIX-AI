import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsArray, ValidateNested, IsUrl } from 'class-validator';
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

export class CreateTrendDto {
  @ApiProperty({ example: 'Marketing de Conteúdo para SaaS', description: 'A query ou tópico da tendência.' })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiProperty({ example: 85, description: 'Pontuação de viralidade ou relevância da tendência (0-100).' })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ example: 'Análise detalhada de como as empresas SaaS estão utilizando o marketing de conteúdo para aquisição de clientes.', description: 'Dados resumidos da tendência.' })
  @IsString()
  @IsNotEmpty()
  data: string;

  @ApiProperty({ type: [SourceDto], required: false, description: 'Lista de fontes da tendência.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  @IsOptional()
  sources?: SourceDto[];
}
