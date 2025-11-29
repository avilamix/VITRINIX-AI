
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OrganizationResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  @IsString()
  id: string;

  @ApiProperty({ example: 'My Marketing Agency' })
  @IsString()
  name: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;

  @ApiProperty({ example: 'fileSearchStores/my-org-kb', required: false })
  @IsString()
  @IsOptional()
  fileSearchStoreName?: string;
}
