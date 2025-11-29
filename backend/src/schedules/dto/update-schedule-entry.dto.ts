import { PartialType } from '@nestjs/swagger';
import { CreateScheduleEntryDto, SOCIAL_PLATFORMS, SCHEDULE_STATUSES } from './create-schedule-entry.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsIn, IsUUID } from 'class-validator';
import { LIBRARY_ITEM_TYPES } from '../../files/dto/create-library-item.dto';

export class UpdateScheduleEntryDto extends PartialType(CreateScheduleEntryDto) {
  @ApiProperty({ example: '2025-01-01T12:00:00Z', required: false, description: 'Nova data e hora agendada.' })
  @IsDateString()
  @IsOptional()
  datetime?: Date;

  @ApiProperty({ example: 'Facebook', enum: SOCIAL_PLATFORMS, required: false, description: 'Nova plataforma.' })
  @IsString()
  @IsOptional()
  @IsIn(SOCIAL_PLATFORMS)
  platform?: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q', required: false, description: 'Novo ID do LibraryItem.' })
  @IsUUID()
  @IsOptional()
  contentId?: string;

  @ApiProperty({ example: 'video', enum: LIBRARY_ITEM_TYPES, required: false, description: 'Novo tipo de conteúdo.' })
  @IsString()
  @IsOptional()
  @IsIn(LIBRARY_ITEM_TYPES)
  contentType?: string;

  @ApiProperty({ example: 'published', enum: SCHEDULE_STATUSES, required: false, description: 'Novo status do agendamento.' })
  @IsString()
  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: string;
}
