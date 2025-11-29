import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayUnique, MaxLength, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { LIBRARY_ITEM_TYPES } from './create-library-item.dto';

export class GetLibraryItemsFilterDto {
  @ApiProperty({ example: 'image', enum: LIBRARY_ITEM_TYPES, required: false, description: 'Filtrar por tipo de item.' })
  @IsString()
  @IsOptional()
  @IsIn(LIBRARY_ITEM_TYPES)
  type?: string;

  @ApiProperty({ example: 'verao,campanha', required: false, description: 'Tags para filtrar (separadas por vírgula).' })
  @IsOptional()
  @Transform(({ value }) => value.split(',').map(tag => tag.trim()).filter(Boolean))
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];

  @ApiProperty({ example: 'criativo', required: false, description: 'Termo de busca no nome do item.' })
  @IsString()
  @IsOptional()
  searchTerm?: string;
}
