import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsDateString, IsIn, IsArray, ArrayMinSize, ArrayNotEmpty, Matches } from 'class-validator';

export class UploadFileResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  fileId: string;

  @ApiProperty({ example: 'report.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 102400 }) // bytes
  size: number;

  @ApiProperty({ example: 'files/123456789' })
  geminiFileId: string;

  @ApiProperty({ example: 'ACTIVE' })
  geminiFileStatus: string;

  @ApiProperty({ example: 'PDF', required: false })
  documentType?: string;

  @ApiProperty({ example: 'LancamentoProdutoX', required: false })
  campaign?: string;

  @ApiProperty({ example: 'Marketing', required: false })
  sector?: string;

  @ApiProperty({ example: 'ClienteABC', required: false })
  client?: string;
}

// DTO para listar arquivos (retorno)
export class ListFilesResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  id: string; // Nosso ID no DB

  @ApiProperty({ example: 'report.pdf' })
  originalName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: 'files/123456789' })
  geminiFileId: string;

  @ApiProperty({ example: 'ACTIVE' })
  geminiFileStatus: string;

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'PDF', required: false })
  documentType?: string;

  @ApiProperty({ example: 'LancamentoProdutoX', required: false })
  campaign?: string;

  @ApiProperty({ example: 'Marketing', required: false })
  sector?: string;

  @ApiProperty({ example: 'ClienteABC', required: false })
  client?: string;
}
