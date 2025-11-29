import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

export const DOCUMENT_TYPES = ['PDF', 'DOCX', 'TXT', 'XLSX', 'IMAGE', 'OTHER'];

export class MetadataDto {
  @ApiProperty({ enum: DOCUMENT_TYPES, example: 'PDF', required: false })
  @IsString()
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: string;

  @ApiProperty({ example: 'LancamentoProdutoX', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  campaign?: string;

  @ApiProperty({ example: 'Marketing', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  sector?: string;

  @ApiProperty({ example: 'ClienteABC', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  client?: string;
}
