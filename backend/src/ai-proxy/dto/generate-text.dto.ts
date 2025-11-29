import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { GenerateContentRequest } from '@google/generative-ai';

export class GenerateTextDto {
  @ApiProperty({ example: 'Write a blog post about AI in marketing.' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ example: 'gemini-1.5-flash', default: 'gemini-1.5-flash', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    example: { temperature: 0.7, topP: 0.95 },
    required: false,
    description: 'Optional generation configuration for the AI model',
  })
  @IsOptional()
  options?: Partial<GenerateContentRequest['generationConfig']>;
}

export class GenerateTextResponseDto {
  @ApiProperty({ example: 'Sure, here is a blog post about AI in marketing...' })
  text: string;
}
