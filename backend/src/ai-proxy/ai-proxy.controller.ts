import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { AiProxyService } from './ai-proxy.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { GenerateTextDto, GenerateTextResponseDto } from './dto/generate-text.dto';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('AI Proxy')
@Controller('organizations/:organizationId/ai-proxy')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard) // Protege com autenticação e RBAC
@ApiBearerAuth('firebase-auth')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('generate-text')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER) // Exemplo: Todos podem gerar texto
  @ApiOperation({ summary: 'Generate text content using AI via proxy' })
  @ApiResponse({ status: 200, description: 'Generated text content', type: GenerateTextResponseDto })
  async generateText(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: GenerateTextDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<GenerateTextResponseDto> {
    const text = await this.aiProxyService.generateText(organizationId, firebaseUid, dto.prompt, dto.model, dto.options);
    return { text };
  }

  // TODO: Adicionar endpoints para outras operações de IA (generate-image, generate-video, etc.)
  // Exemplo:
  // @Post('generate-image')
  // @Roles(Role.ADMIN, Role.EDITOR)
  // async generateImage(@Param('organizationId') organizationId: string, @Body() dto: GenerateImageDto) { /* ... */ }
}
