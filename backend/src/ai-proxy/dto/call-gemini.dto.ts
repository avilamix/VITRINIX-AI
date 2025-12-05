
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CallGeminiDto {
  @ApiProperty({ example: 'gemini-2.5-flash', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ 
    type: 'object', 
    description: 'The content for the model. Can be a string, array of parts, or array of Content objects.'
  })
  @IsNotEmpty()
  contents: any;

  @ApiProperty({ 
    type: 'object', 
    required: false, 
    description: 'Configuration object for the generation request (e.g., temperature, tools, systemInstruction).'
  })
  @IsObject()
  @IsOptional()
  config?: any;
}

export class CallGeminiResponseDto {
  @ApiProperty({ type: 'object', description: 'Raw response object from Gemini API (GenerateContentResponse).' })
  response: any;
}
