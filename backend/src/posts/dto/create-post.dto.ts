import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayUnique, MaxLength } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'Este é o conteúdo do meu post para mídia social.', description: 'O texto principal do post.' })
  @IsString()
  @IsNotEmpty()
  contentText: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false, description: 'URL de uma imagem anexada ao post.' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: ['marketing', 'ai', 'dicas'], required: false, description: 'Tags associadas ao post.' })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];
}
