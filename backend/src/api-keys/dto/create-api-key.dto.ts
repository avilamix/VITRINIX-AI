
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ModelProvider } from '@prisma/client';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My Personal Gemini Key' })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({ example: 'AIzaSy...' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ enum: ModelProvider, example: ModelProvider.Google_Gemini })
  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
