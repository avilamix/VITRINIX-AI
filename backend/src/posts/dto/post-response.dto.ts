import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsDate } from 'class-validator';

export class PostResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  organizationId: string;

  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5s' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Este é o conteúdo do meu post para mídia social.' })
  @IsString()
  contentText: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', nullable: true })
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: ['marketing', 'ia'], isArray: true })
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
