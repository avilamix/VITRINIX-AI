import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayUnique, MaxLength, IsUrl, IsIn } from 'class-validator';

export const LIBRARY_ITEM_TYPES = ['image', 'video', 'audio', 'text', 'post', 'ad']; // Updated to include 'post' and 'ad'

export class CreateLibraryItemDto {
  @ApiProperty({ example: 'Meu Criativo de Verão', description: 'Nome do item na biblioteca.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'image', enum: LIBRARY_ITEM_TYPES, description: 'Tipo do item na biblioteca.' })
  @IsString()
  @IsNotEmpty()
  @IsIn(LIBRARY_ITEM_TYPES)
  type: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/image.jpg', description: 'URL do arquivo real (pode ser GCS, CDN, etc.).' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false }) // Allow internal/relative URLs for mock or dev purposes, adjust as needed
  fileUrl: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/thumb.jpg', required: false, description: 'URL de uma miniatura para o item.' })
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @ApiProperty({ example: ['verao', 'campanha', 'social'], required: false, description: 'Tags associadas ao item.' })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];
}