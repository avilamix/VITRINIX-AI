import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class OrganizationResponseDto {
  @ApiProperty({ example: 'clx0p92g50000r55m2h3k4l5q' })
  id: string;

  @ApiProperty({ example: 'My Marketing Agency' })
  name: string;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;
}
