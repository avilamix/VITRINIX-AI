import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsIn, MaxLength, IsUUID } from 'class-validator';
import { LIBRARY_ITEM_TYPES } from '../../files/dto/create-library-item.dto'; // Reutilizar tipos da biblioteca

export const SCHEDULE_STATUSES = ['scheduled', 'published', 'failed'];
export const SOCIAL_PLATFORMS = ['Instagram', 'Facebook', 'TikTok', 'Pinterest', 'GoogleMyBusiness'];

export class CreateScheduleEntryDto {
  @ApiProperty({ example: '2024-12-25T10:00:00Z', description: 'Data e hora da publicação agendada (ISO 8601).' })
  @IsDateString()
  @IsNotEmpty()
  datetime: Date;

  @ApiProperty({ example: 'Instagram', enum: SOCIAL_PLATFORMS, description: 'Plataforma social para publicação.' })
  @IsString()
  @IsNotEmpty()
  @IsIn(SOCIAL_PLATFORMS)
  platform: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p', description: 'ID do LibraryItem a ser publicado.' })
  @IsUUID()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({ example: 'image', enum: LIBRARY_ITEM_TYPES, description: 'Tipo de conteúdo do LibraryItem.' })
  @IsString()
  @IsNotEmpty()
  @IsIn(LIBRARY_ITEM_TYPES)
  contentType: string;

  @ApiProperty({ example: 'scheduled', enum: SCHEDULE_STATUSES, description: 'Status inicial do agendamento.' })
  @IsString()
  @IsNotEmpty()
  @IsIn(SCHEDULE_STATUSES)
  status: string;
}
