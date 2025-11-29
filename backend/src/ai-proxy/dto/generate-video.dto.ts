
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray } from 'class-validator';

export class VideoAssetDto {
  @ApiProperty({ example: 'iVBORw0KGgoAAAANSUhEUgA...', description: 'Base64 encoded image bytes' })
  @IsString()
  @IsNotEmpty()
  imageBytes: string;

  @ApiProperty({ example: 'image/png', description: 'IANA standard MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;
}

export class VideoGenerationReferenceImageDto {
  @ApiProperty({ type: VideoAssetDto })
  @IsObject()
  @IsNotEmpty()
  image: VideoAssetDto;

  @ApiProperty({ enum: ['ASSET', 'STYLE'], example: 'ASSET' })
  @IsString()
  @IsNotEmpty()
  referenceType: string; // VideoGenerationReferenceType
}

export class GenerateVideoDto {
  @ApiProperty({ example: 'A neon hologram of a cat driving at top speed', required: false })
  @IsString()
  @IsOptional()
  prompt?: string; // Prompt is optional if images are provided

  @ApiProperty({ example: 'veo-3.1-fast-generate-preview', default: 'veo-3.1-fast-generate-preview', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ type: VideoAssetDto, required: false, description: 'Optional starting image' })
  @IsObject()
  @IsOptional()
  image?: VideoAssetDto;

  @ApiProperty({ type: VideoAssetDto, required: false, description: 'Optional last frame image' })
  @IsObject()
  @IsOptional()
  lastFrame?: VideoAssetDto;

  @ApiProperty({ type: [VideoGenerationReferenceImageDto], required: false, description: 'Up to 3 reference images' })
  @IsArray()
  @IsOptional()
  referenceImages?: VideoGenerationReferenceImageDto[];

  @ApiProperty({
    example: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' },
    required: false,
    description: 'Configuration for video generation',
  })
  @IsObject()
  @IsOptional()
  videoConfig?: {
    numberOfVideos?: number;
    resolution?: '720p' | '1080p';
    aspectRatio?: '16:9' | '9:16';
  };
}

export class GenerateVideoResponseDto {
  @ApiProperty({ example: 'https://generativelanguage.googleapis.com/v1/operations/XXXX/response.mp4' })
  videoUri: string;
}
