import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class QueryKnowledgeBaseDto {
  @ApiProperty({ example: 'What is the main topic of the uploaded reports?' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ example: 'gemini-1.5-flash', required: false, default: 'gemini-1.5-flash' })
  @IsString()
  @IsOptional()
  model?: string;
}

export class QueryKnowledgeBaseResponseDto {
  @ApiProperty({ example: 'The main topic of the uploaded reports is Artificial Intelligence in marketing strategies.' })
  @IsString()
  resposta: string;

  @ApiProperty({ example: ['report_q3_2023.pdf', 'ai_trends_analysis.docx'] })
  arquivos_usados: string[];

  @ApiProperty({ example: ['"AI is revolutionizing marketing by enabling hyper-personalization..."'] })
  trechos_referenciados: string[];

  @ApiProperty({ example: 0.95, description: 'Confidence score (0.0 to 1.0) based on grounding evidence' })
  @IsNumber()
  confianca: number;
}
