

import { ApiProperty } from '@nestjs/swagger';
import { OrganizationMembershipDto, OrganizationDto } from './organization-membership.dto';

// Re-use OrganizationDto to define the user part of the response
class UserDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5p' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe', required: false })
  name?: string;
}

export class LoginResponseDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiProperty({ type: [OrganizationMembershipDto] })
  organizations: OrganizationMembershipDto[];
}
