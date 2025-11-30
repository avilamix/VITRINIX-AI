

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus, UploadedFile, UseInterceptors, Query } from '@nestjs/common';
import { FilesService } from './files.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { LibraryItemResponseDto } from './dto/library-item-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetLibraryItemsFilterDto } from './dto/get-library-items-filter.dto';

@ApiTags('Files (Library)')
@Controller('organizations/:organizationId/files')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Roles(Role.ADMIN, Role.EDITOR)
  @UseInterceptors(FileInterceptor('file')) // 'file' é o nome do campo no formulário
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'O arquivo a ser enviado (imagem, vídeo, áudio, texto).'
        },
        name: { type: 'string', example: 'Meu Criativo de Verão', description: 'Nome do item na biblioteca.' },
        type: { type: 'string', example: 'image', enum: ['image', 'video', 'audio', 'text'], description: 'Tipo do item.' },
        tags: { type: 'string', example: 'verao, promocao, social', description: 'Tags separadas por vírgula.' },
      },
      required: ['file', 'name', 'type'],
    },
  })
  @ApiOperation({ summary: 'Upload a file and create a new LibraryItem for the organization' })
  @ApiResponse({ status: 201, description: 'File uploaded and LibraryItem created.', type: LibraryItemResponseDto })
  async upload(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    // FIX: Add @UploadedFile() decorator and use any type for 'file' parameter
    @UploadedFile() file: any,
    @Body('name') name: string,
    @Body('type') type: string, // Validate enum type later or convert
    @Body('tags') tags?: string, // Comma-separated tags
  ): Promise<LibraryItemResponseDto> {
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
    return this.filesService.uploadFileAndCreateLibraryItem(organizationId, firebaseUid, file, name, type, tagsArray);
  }

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new LibraryItem without direct file upload (e.g., for external URLs)' })
  @ApiResponse({ status: 201, description: 'The LibraryItem has been successfully created.', type: LibraryItemResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createLibraryItemDto: CreateLibraryItemDto,
  ): Promise<LibraryItemResponseDto> {
    return this.filesService.create(organizationId, firebaseUid, createLibraryItemDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all LibraryItems for the organization, with optional filters' })
  @ApiResponse({ status: 200, description: 'List of LibraryItems.', type: [LibraryItemResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() filters: GetLibraryItemsFilterDto,
  ): Promise<LibraryItemResponseDto[]> {
    return this.filesService.findAll(organizationId, filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get a LibraryItem by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The LibraryItem details.', type: LibraryItemResponseDto })
  @ApiResponse({ status: 404, description: 'LibraryItem not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LibraryItemResponseDto> {
    return this.filesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a LibraryItem by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The LibraryItem has been successfully updated.', type: LibraryItemResponseDto })
  @ApiResponse({ status: 404, description: 'LibraryItem not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLibraryItemDto: UpdateLibraryItemDto,
  ): Promise<LibraryItemResponseDto> {
    return this.filesService.update(organizationId, id, updateLibraryItemDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a LibraryItem by ID for the organization (and its file from storage)' })
  @ApiResponse({ status: 204, description: 'The LibraryItem and associated file have been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'LibraryItem not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.filesService.remove(organizationId, id);
  }
}
