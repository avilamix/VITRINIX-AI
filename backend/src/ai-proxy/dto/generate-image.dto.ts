
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class GenerateImageDto {
  @ApiProperty({ example: 'A robot holding a red skateboard.' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ example: 'gemini-2.5-flash-image', default: 'gemini-2.5-flash-image', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    example: { aspectRatio: '1:1', imageSize: '1K' },
    required: false,
    description: 'Configuration for image generation (aspectRatio, imageSize).',
  })
  @IsObject()
  @IsOptional()
  imageConfig?: {
    aspectRatio?: string;
    imageSize?: string;
  };

  @ApiProperty({
    example: { temperature: 0.7, topP: 0.95 },
    required: false,
    description: 'Optional generation configuration for the AI model',
  })
  @IsObject()
  @IsOptional()
  options?: any; // Further refine if specific options are needed
}

export class GenerateImageResponseDto {
  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgA...' })
  base64Image: string;

  @ApiProperty({ example: 'image/png' })
  mimeType: string;
}
