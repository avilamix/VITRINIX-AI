
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class UserDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string;
}

// Atualizar OrganizationDto para incluir fileSearchStoreName
export class OrganizationResponseInMembershipDto {
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
  @ApiProperty({ type: OrganizationResponseInMembershipDto }) // Usar o DTO atualizado
  organization: OrganizationResponseInMembershipDto;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ type: [OrganizationMembershipDto] })
  organizations: OrganizationMembershipDto[];
}
