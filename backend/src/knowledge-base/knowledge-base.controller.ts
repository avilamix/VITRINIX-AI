import { Controller, Post, Get, Param, Body, UseGuards, UploadedFile, UseInterceptors, HttpCode, HttpStatus, Query, ParseUUIDPipe, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateFileSearchStoreDto, FileSearchStoreResponseDto } from './dto/create-store.dto';
import { QueryKnowledgeBaseDto, QueryKnowledgeBaseResponseDto } from './dto/query-store.dto';
import { ListFilesResponseDto, UploadFileResponseDto } from './dto/upload-file.dto';
import { multerOptions } from './config/multer.config';
import { MetadataDto } from './dto/metadata.dto';

@ApiTags('Knowledge Base (RAG)')
@Controller('organizations/:organizationId/knowledge-base')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post('store')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Create or get a File Search Store for the organization' })
  @ApiResponse({ status: 200, description: 'File Search Store details', type: FileSearchStoreResponseDto })
  async createStore(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() dto: CreateFileSearchStoreDto,
  ): Promise<FileSearchStoreResponseDto> {
    return this.knowledgeBaseService.findOrCreateFileSearchStore(organizationId, firebaseUid, dto.displayName);
  }

  @Get('store')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get the File Search Store details for the organization' })
  @ApiResponse({ status: 200, description: 'File Search Store details', type: FileSearchStoreResponseDto })
  @ApiResponse({ status: 404, description: 'File Search Store not found' })
  async getStore(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<FileSearchStoreResponseDto> {
    return this.knowledgeBaseService.getFileSearchStore(organizationId);
  }

  @Post('upload-file')
  @Roles(Role.ADMIN, Role.EDITOR)
  @UseInterceptors(FileInterceptor('file', multerOptions)) // 'file' é o nome do campo no formulário
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        documentType: { type: 'string', example: 'PDF', nullable: true },
        campaign: { type: 'string', example: 'LancamentoProdutoX', nullable: true },
        sector: { type: 'string', example: 'Marketing', nullable: true },
        client: { type: 'string', example: 'ClienteABC', nullable: true },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload a file and add it to the organization\'s File Search Store' })
  @ApiResponse({ status: 200, description: 'File uploaded and imported successfully', type: UploadFileResponseDto })
  async uploadFile(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @UploadedFile() file: any, // Changed to any to avoid Express namespace issues if types are missing
    @CurrentUser('uid') firebaseUid: string,
    @Body() metadata: MetadataDto, // Metadados vêm do body como outros campos do form-data
  ): Promise<UploadFileResponseDto> {
    return this.knowledgeBaseService.uploadFileAndAddToStore(organizationId, firebaseUid, file, metadata);
  }

  @Get('files')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'List files in the organization\'s Knowledge Base' })
  @ApiResponse({ status: 200, description: 'List of indexed files', type: [ListFilesResponseDto] })
  async listFiles(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() filters: MetadataDto, // Usar MetadataDto para os filtros
  ): Promise<ListFilesResponseDto[]> {
    return this.knowledgeBaseService.listFiles(organizationId, filters);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('files/:fileId')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Delete a file from the organization\'s Knowledge Base and Gemini' })
  @ApiResponse({ status: 204, description: 'File successfully deleted.' })
  @ApiResponse({ status: 404, description: 'File not found.' })
  async deleteFile(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<void> {
    await this.knowledgeBaseService.deleteFile(organizationId, fileId, firebaseUid);
  }

  @Post('query')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Query the organization\'s File Search Store with a natural language prompt' })
  @ApiResponse({ status: 200, description: 'Response from AI based on indexed files', type: QueryKnowledgeBaseResponseDto })
  async queryStore(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: QueryKnowledgeBaseDto,
    @CurrentUser('uid') firebaseUid: string,
  ): Promise<QueryKnowledgeBaseResponseDto> {
    return this.knowledgeBaseService.queryFileSearchStore(organizationId, firebaseUid, dto.prompt, dto.model);
  }
}