/// <reference types="express" />
/// <reference types="multer" />
// FIX: Add `npm i --save-dev @types/express @types/multer` to resolve Express and Multer types

import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { UpdateLibraryItemDto } from './dto/update-library-item.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { LibraryItemResponseDto } from './dto/library-item-response.dto';
import { GoogleCloudStorageService } from './google-cloud-storage.service';
import { GetLibraryItemsFilterDto } from './dto/get-library-items-filter.dto';
import { LibraryItem } from '@prisma/client';
import { LIBRARY_ITEM_TYPES } from './dto/create-library-item.dto'; // Import LIBRARY_ITEM_TYPES

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private gcsService: GoogleCloudStorageService,
  ) {}

  async uploadFileAndCreateLibraryItem(
    organizationId: string,
    firebaseUid: string,
    // FIX: Add Express.Multer.File type to file parameter
    file: Express.Multer.File,
    name: string,
    type: string,
    tags: string[],
  ): Promise<LibraryItemResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided for upload.');
    }
    // FIX: Use imported LIBRARY_ITEM_TYPES for validation
    if (!LIBRARY_ITEM_TYPES.includes(type)) { 
      throw new BadRequestException(`Invalid item type. Must be one of: ${LIBRARY_ITEM_TYPES.join(', ')}.`);
    }

    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    const fileNameInStorage = `${organizationId}/${user.id}/${Date.now()}-${file.originalname}`;
    const fileUrl = await this.gcsService.uploadFile(file.buffer, fileNameInStorage, file.mimetype);
    const thumbnailUrl = type === 'image' || type === 'video' ? fileUrl : undefined; // Simple thumbnail logic

    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    const libraryItem = await this.prisma.libraryItem.create({
      data: {
        organizationId,
        userId: user.id,
        name,
        type,
        fileUrl,
        thumbnailUrl,
        tags,
      },
    });

    this.logger.log(`File uploaded and LibraryItem created: ${libraryItem.id}, Name: ${libraryItem.name}`);
    return this.mapToResponseDto(libraryItem);
  }

  async create(
    organizationId: string,
    firebaseUid: string,
    createLibraryItemDto: CreateLibraryItemDto,
  ): Promise<LibraryItemResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    const libraryItem = await this.prisma.libraryItem.create({
      data: {
        organizationId,
        userId: user.id,
        name: createLibraryItemDto.name,
        type: createLibraryItemDto.type,
        fileUrl: createLibraryItemDto.fileUrl,
        thumbnailUrl: createLibraryItemDto.thumbnailUrl,
        tags: createLibraryItemDto.tags || [],
      },
    });
    return this.mapToResponseDto(libraryItem);
  }

  async findAll(organizationId: string, filters: GetLibraryItemsFilterDto): Promise<LibraryItemResponseDto[]> {
    const where: any = { organizationId };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasEvery: filters.tags,
      };
    }
    if (filters.searchTerm) {
      where.name = {
        contains: filters.searchTerm,
        mode: 'insensitive', // Case-insensitive search
      };
    }

    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    const libraryItems = await this.prisma.libraryItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return libraryItems.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<LibraryItemResponseDto> {
    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    const libraryItem = await this.prisma.libraryItem.findUnique({
      where: { id, organizationId },
    });
    if (!libraryItem) {
      throw new NotFoundException(`LibraryItem with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(libraryItem);
  }

  async update(organizationId: string, id: string, updateLibraryItemDto: UpdateLibraryItemDto): Promise<LibraryItemResponseDto> {
    await this.findOne(organizationId, id); // Check if item exists

    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    const libraryItem = await this.prisma.libraryItem.update({
      where: { id, organizationId },
      data: {
        name: updateLibraryItemDto.name,
        type: updateLibraryItemDto.type,
        fileUrl: updateLibraryItemDto.fileUrl,
        thumbnailUrl: updateLibraryItemDto.thumbnailUrl,
        tags: updateLibraryItemDto.tags,
      },
    });
    return this.mapToResponseDto(libraryItem);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const libraryItem = await this.findOne(organizationId, id); // Check if item exists

    // Attempt to delete file from GCS first if it's a GCS URL
    if (libraryItem.fileUrl && this.gcsService.isGcsUrl(libraryItem.fileUrl)) {
      try {
        const filePath = this.gcsService.getFilePathFromUrl(libraryItem.fileUrl);
        await this.gcsService.deleteFile(filePath);
        this.logger.log(`Deleted file from GCS for LibraryItem ${id}: ${filePath}`);
      } catch (gcsError: any) { // Cast gcsError to any
        this.logger.error(`Failed to delete file from GCS for LibraryItem ${id}: ${gcsError.message}`);
        // Log error but don't prevent DB deletion, as GCS might be a fallback storage
      }
    }

    // FIX: Access 'libraryItem' model via this.prisma.libraryItem
    await this.prisma.libraryItem.delete({
      where: { id, organizationId },
    });
    this.logger.log(`LibraryItem ${id} deleted from DB.`);
  }

  private mapToResponseDto(item: LibraryItem): LibraryItemResponseDto {
    return {
      id: item.id,
      organizationId: item.organizationId,
      userId: item.userId,
      name: item.name,
      type: item.type,
      fileUrl: item.fileUrl,
      thumbnailUrl: item.thumbnailUrl,
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}