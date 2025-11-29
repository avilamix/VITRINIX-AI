
import { Controller, Post, Body, UseGuards, Param, HttpCode, HttpStatus } from '@nestjs/common';
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
import { GenerateImageDto, GenerateImageResponseDto } from './dto/generate-image.dto'; // NOVO
import { GenerateVideoDto, GenerateVideoResponseDto } from './dto/generate-video.dto'; // NOVO
import { GenerateSpeechDto, GenerateSpeechResponseDto } from './dto/generate-speech.dto'; // NOVO
import { CallGeminiDto, CallGeminiResponseDto } from './dto/call-gemini.dto'; // NOVO

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
    const response = await this.aiProxyService.generateText(organizationId, firebaseUid, dto.prompt, dto.model, dto.options);
    return { text: response.text() }; // Retorna apenas o texto
  }

  @Post('generate-image')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Generate image content using AI via proxy' })
  @ApiResponse({ status: 200, description: 'Generated image content (base64)', type: GenerateImageResponseDto })
  async generateImage(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: GenerateImageDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<GenerateImageResponseDto> {
    const response = await this.aiProxyService.generateImage(organizationId, firebaseUid, dto.prompt, dto.model, dto.imageConfig, dto.options);
    const imageUrlPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!imageUrlPart) throw new Error('No image part found in response.');
    return { base64Image: imageUrlPart.inlineData.data, mimeType: imageUrlPart.inlineData.mimeType };
  }

  @Post('generate-video')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Generate video content using AI via proxy' })
  @ApiResponse({ status: 200, description: 'Generated video download URI', type: GenerateVideoResponseDto })
  async generateVideo(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: GenerateVideoDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<GenerateVideoResponseDto> {
    const downloadUri = await this.aiProxyService.generateVideo(organizationId, firebaseUid, dto.prompt, dto.model, dto.videoConfig, dto.image, dto.lastFrame, dto.referenceImages);
    return { videoUri: downloadUri };
  }

  @Post('generate-speech')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Generate speech (TTS) from text using AI via proxy' })
  @ApiResponse({ status: 200, description: 'Generated audio content (base64)', type: GenerateSpeechResponseDto })
  async generateSpeech(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: GenerateSpeechDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<GenerateSpeechResponseDto> {
    const response = await this.aiProxyService.generateSpeech(organizationId, firebaseUid, dto.text, dto.model, dto.speechConfig);
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (!audioPart) throw new Error('No audio part found in response.');
    return { base64Audio: audioPart.inlineData.data, mimeType: audioPart.inlineData.mimeType };
  }

  @Post('call-gemini')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER) // Pode ser ajustado conforme necessidade
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generic call to Gemini API for various content generation tasks (chamarGemini)' })
  @ApiResponse({ status: 200, description: 'Generic AI response', type: CallGeminiResponseDto })
  async callGemini(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CallGeminiDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<CallGeminiResponseDto> {
    const response = await this.aiProxyService.callGemini(organizationId, firebaseUid, dto.model, dto.contents, dto.config);
    return { response: response };
  }
}
