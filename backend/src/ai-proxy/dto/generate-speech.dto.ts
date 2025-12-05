

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class SpeechConfigDto {
  @ApiProperty({ example: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, description: 'Voice configuration' })
  @IsObject()
  @IsOptional()
  voiceConfig?: {
    prebuiltVoiceConfig?: {
      voiceName?: string; // e.g., 'Kore', 'Zephyr'
    };
    customVoiceConfig?: {
      audioConfig?: any; // More detailed custom voice config
    };
  };

  @ApiProperty({ example: { speakerVoiceConfigs: [{speaker: 'Joe', voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Kore'}}}] }, required: false, description: 'Multi-speaker configuration' })
  @IsObject()
  @IsOptional()
  multiSpeakerVoiceConfig?: {
    speakerVoiceConfigs: Array<{
      speaker: string;
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: string };
      };
    }>;
  };
}

export class GenerateSpeechDto {
  @ApiProperty({ example: 'Hello, how can I help you today?' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: 'gemini-2.5-flash-preview-tts', default: 'gemini-2.5-flash-preview-tts', required: false })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiProperty({ type: SpeechConfigDto, required: false })
  @IsObject()
  @IsOptional()
  speechConfig?: SpeechConfigDto;
}

export class GenerateSpeechResponseDto {
  @ApiProperty({ example: 'QUlPUEFS...' })
  base64Audio: string;

  @ApiProperty({ example: 'audio/pcm;rate=24000' })
  mimeType: string;
}
