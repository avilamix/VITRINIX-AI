import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsArray, IsOptional } from 'class-validator';
import { LIBRARY_ITEM_TYPES } from './create-library-item.dto';

export class LibraryItemResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Meu Criativo de Verão' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'image', enum: LIBRARY_ITEM_TYPES })
  @IsString()
  type: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/image.jpg' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 'https://storage.googleapis.com/my-bucket/thumb.jpg', nullable: true })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ example: ['verao', 'campanha'], isArray: true })
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2023-10-27T10:30:00.000Z' })
  @IsDate()
  updatedAt: Date;
}
