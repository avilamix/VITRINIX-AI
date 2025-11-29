

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsObject } from 'class-validator';
import { GenerateContentRequest, Part, Tool, ToolConfig, FunctionDeclaration } from '@google/genai';
import { Type } from 'class-transformer';

// Replicar tipos do SDK para validação
class ContentPartDto implements Part {
  @ApiProperty({ type: 'string', required: false })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiProperty({ type: 'object', required: false, description: 'inlineData representation' })
  @IsObject()
  @IsOptional()
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded string
  };

  @ApiProperty({ type: 'object', required: false, description: 'fileData representation' })
  @IsObject()
  @IsOptional()
  fileData?: {
    mimeType: string;
    fileUri: string;
  };
}

class ContentDto {
  @ApiProperty({ enum: ['user', 'model'], required: false })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiProperty({ type: [ContentPartDto] })
  @ValidateNested({ each: true })
  @Type(() => ContentPartDto)
  parts: ContentPartDto[];
}

class GenerationConfigDto {
  @ApiProperty({ example: 0.7, required: false })
  @IsOptional()
  temperature?: number;

  @ApiProperty({ example: 0.95, required: false })
  @IsOptional()
  topP?: number;

  @ApiProperty({ example: 64, required: false })
  @IsOptional()
  topK?: number;

  @ApiProperty({ example: 1024, required: false })
  @IsOptional()
  maxOutputTokens?: number;

  @ApiProperty({ example: 'application/json', required: false })
  @IsString()
  @IsOptional()
  responseMimeType?: string;
  
  @ApiProperty({ example: 42, required: false })
  @IsOptional()
  seed?: number;

  @ApiProperty({ type: 'object', required: false })
  @IsOptional()
  thinkingConfig?: { thinkingBudget?: number };
}

class SafetySettingDto {
  @ApiProperty({ enum: ['HARASSMENT', 'HATE_SPEECH', 'SEXUALLY_EXPLICIT', 'DANGEROUS_CONTENT'] })
  @IsString()
  @IsNotEmpty()
  category: string; // HarmCategory

  @ApiProperty({ enum: ['HARM_BLOCK_THRESHOLD_UNSPECIFIED', 'BLOCK_LOW_AND_ABOVE', 'BLOCK_MEDIUM_AND_ABOVE', 'BLOCK_ONLY_HIGH', 'BLOCK_NONE'] })
  @IsString()
  @IsNotEmpty()
  threshold: string; // HarmBlockThreshold
}

class ToolFunctionDeclarationParametersPropertyDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  enum?: string[];
}

class ToolFunctionDeclarationParametersDto {
  @ApiProperty()
  @IsString()
  type: string; // e.g., 'OBJECT'

  @ApiProperty({ type: 'string', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: () => Object, additionalProperties: { type: ToolFunctionDeclarationParametersPropertyDto }, required: false })
  @IsObject()
  @IsOptional()
  properties?: { [key: string]: ToolFunctionDeclarationParametersPropertyDto };

  @ApiProperty({ type: [String], required: false })
  @IsString({ each: true })
  @IsOptional()
  required?: string[];
}

class ToolFunctionDeclarationDto implements FunctionDeclaration {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: ToolFunctionDeclarationParametersDto })
  @ValidateNested()
  @Type(() => ToolFunctionDeclarationParametersDto)
  parameters: ToolFunctionDeclarationParametersDto;
}

class ToolDto implements Tool {
  @ApiProperty({ type: [ToolFunctionDeclarationDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ToolFunctionDeclarationDto)
  functionDeclarations?: ToolFunctionDeclarationDto[];

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  googleSearch?: any;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  fileSearch?: any;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  googleMaps?: any;
}


class GeminiConfigDto {
  @ApiProperty({ type: GenerationConfigDto, required: false })
  @ValidateNested()
  @Type(() => GenerationConfigDto)
  @IsOptional()
  generationConfig?: GenerationConfigDto;

  @ApiProperty({ type: [SafetySettingDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => SafetySettingDto)
  @IsOptional()
  safetySettings?: SafetySettingDto[];

  @ApiProperty({ type: [ToolDto], required: false })
  @ValidateNested({ each: true })
  @Type(() => ToolDto)
  @IsOptional()
  tools?: ToolDto[];

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  toolConfig?: ToolConfig;

  @ApiProperty({ example: 'You are a helpful assistant.', required: false })
  @IsString()
  @IsOptional()
  systemInstruction?: string;

  @ApiProperty({ example: 'application/json', required: false })
  @IsString()
  @IsOptional()
  responseMimeType?: string;

  @ApiProperty({ type: 'object', required: false })
  @IsObject()
  @IsOptional()
  responseSchema?: any; // Cannot strongly type GenerateContentRequest['config']['responseSchema'] without circular dependency or complex setup
}

export class CallGeminiDto {
  @ApiProperty({ example: 'gemini-1.5-flash', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ type: [ContentDto], description: 'Array of content parts, e.g., text, inlineData for multimodal.' })
  @ValidateNested({ each: true })
  @Type(() => ContentDto)
  contents: ContentDto[];

  @ApiProperty({ type: GeminiConfigDto, required: false })
  @ValidateNested()
  @Type(() => GeminiConfigDto)
  @IsOptional()
  config?: GeminiConfigDto;
}

export class CallGeminiResponseDto {
  @ApiProperty({ type: 'object', description: 'Raw response object from Gemini API (GenerateContentResponse).' })
  response: any;
}