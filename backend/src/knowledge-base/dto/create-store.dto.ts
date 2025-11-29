import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateFileSearchStoreDto {
  @ApiProperty({ example: 'My Company Knowledge Base', required: false, maxLength: 100 })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  displayName?: string;
}

export class FileSearchStoreResponseDto {
  @ApiProperty({ example: 'fileSearchStores/my-store-123' })
  storeName: string;

  @ApiProperty({ example: 'My Company Knowledge Base' })
  displayName: string;
}
