import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional } from 'class-validator';
import { SOCIAL_PLATFORMS, SCHEDULE_STATUSES } from './create-schedule-entry.dto';
import { LIBRARY_ITEM_TYPES } from '../../files/dto/create-library-item.dto';

export class ScheduleEntryResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '2024-12-25T10:00:00.000Z' })
  @IsDate()
  datetime: Date;

  @ApiProperty({ example: 'Instagram', enum: SOCIAL_PLATFORMS })
  @IsString()
  platform: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5t' })
  @IsString()
  contentId: string;

  @ApiProperty({ example: 'image', enum: LIBRARY_ITEM_TYPES })
  @IsString()
  contentType: string;

  @ApiProperty({ example: 'scheduled', enum: SCHEDULE_STATUSES })
  @IsString()
  status: string;

  @ApiProperty({ example: '2023-10-27T10:00:00.000Z' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ example: '2023-10-27T10:30:00.000Z' })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({ example: 'Meu criativo de natal', required: false, description: 'Nome do item da biblioteca associado.' })
  @IsString()
  @IsOptional()
  libraryItemName?: string;

  @ApiProperty({ example: 'https://cdn.example.com/thumbnail.jpg', required: false, description: 'URL da miniatura do item da biblioteca associado.' })
  @IsString()
  @IsOptional()
  libraryItemThumbnailUrl?: string;
}
