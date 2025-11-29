import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ArrayUnique, MaxLength } from 'class-validator';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiProperty({ example: 'Conteúdo atualizado do post.', required: false, description: 'O novo texto principal do post.' })
  @IsString()
  @IsOptional()
  contentText?: string;

  @ApiProperty({ example: 'https://example.com/new_image.jpg', required: false, description: 'Nova URL de imagem para o post.' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ example: ['tecnologia', 'social'], required: false, description: 'Novas tags para o post.' })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @IsOptional()
  tags?: string[];
}
