
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OrganizationDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  id: string;

  @ApiProperty({ example: 'My Marketing Agency' })
  name: string;

  @ApiProperty({ example: 'fileSearchStores/my-org-kb', required: false })
  @IsString()
  @IsOptional()
  fileSearchStoreName?: string;
}

export class OrganizationMembershipDto {
  @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;
}
