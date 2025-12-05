
import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider, ApiKeyStatus } from '@prisma/client';

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty({ enum: ModelProvider })
  provider: ModelProvider;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ enum: ApiKeyStatus })
  status: ApiKeyStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  lastUsedAt: Date | null;
}
