import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class OrganizationDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  id: string;

  @ApiProperty({ example: 'My Marketing Agency' })
  name: string;
}

export class OrganizationMembershipDto {
  @ApiProperty({ type: OrganizationDto })
  organization: OrganizationDto;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;
}
