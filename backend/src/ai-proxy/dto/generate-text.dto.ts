
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, ValidateNested, IsArray } from 'class-validator';
import { GenerateContentParameters, Tool, Content } from '@google/genai';

export class GenerateTextDto {
  @ApiProperty({ example: 'Write a blog post about AI in marketing.' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ example: 'gemini-2.5-flash', default: 'gemini-2.5-flash', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({
    example: { temperature: 0.7, topP: 0.95 },
    required: false,
    description: 'Optional generation configuration for the AI model',
  })
  @IsObject()
  @IsOptional()
  options?: Partial<GenerateContentParameters['config']>;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    required: false,
    description: 'Optional tools for the AI model (e.g., Google Search, Function Calling)',
  })
  @IsArray()
  @IsOptional()
  tools?: Tool[];

  @ApiProperty({
      type: 'array',
      items: { type: 'object' },
      required: false,
      description: 'Chat history for conversational context',
  })
  @IsArray()
  @IsOptional()
  history?: Content[];
}

export class GenerateTextResponseDto {
  @ApiProperty({ example: 'Sure, here is a blog post about AI in marketing...' })
  text: string;
}
