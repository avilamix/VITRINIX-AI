import { PartialType } from '@nestjs/swagger';
import { CreateLibraryItemDto, LIBRARY_ITEM_TYPES } from './create-library-item.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayUnique, MaxLength, IsUrl, IsIn } from 'class-validator';

export class UpdateLibraryItemDto extends PartialType(CreateLibraryItemDto) {
  @ApiProperty({ example: 'Novo Nome do Criativo', required: false, description: 'Novo nome do item.' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ example: 'video', enum: LIBRARY_ITEM_TYPES, required: false, description: 'Novo tipo do item.' })
  @IsString()
  @IsOptional()
  @IsIn(LIBRARY_ITEM_TYPES)
  type?: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/new-file.mp4', required: false, description: 'Nova URL do arquivo.' })
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  fileUrl?: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/new-thumb.jpg', required: false, description: 'Nova URL da miniatura.' })
  @IsString()
  @IsOptional()
  @IsUrl({ require_tld: false })
  thumbnailUrl?: string;

  @ApiProperty({ example: ['outono', 'promocao'], required: false, description: 'Novas tags para o item.' })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];
}
