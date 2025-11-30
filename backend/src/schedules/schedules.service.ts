
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateScheduleEntryDto } from './dto/create-schedule-entry.dto';
import { UpdateScheduleEntryDto } from './dto/update-schedule-entry.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { ScheduleEntryResponseDto } from './dto/schedule-entry-response.dto';
import { FilesService } from '../files/files.service'; // Para validar contentId

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private filesService: FilesService, // Para validar LibraryItem
  ) {}

  async create(organizationId: string, firebaseUid: string, createScheduleEntryDto: CreateScheduleEntryDto): Promise<ScheduleEntryResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // Validar se o contentId realmente existe como um LibraryItem na organização
    const libraryItem = await this.filesService.findOne(organizationId, createScheduleEntryDto.contentId);
    if (!libraryItem) {
        throw new NotFoundException(`Content ID ${createScheduleEntryDto.contentId} not found in library.`);
    }
    // Opcional: validar se o contentType no DTO bate com o tipo do LibraryItem
    if (libraryItem.type !== createScheduleEntryDto.contentType) {
        throw new BadRequestException(`Content type mismatch: provided '${createScheduleEntryDto.contentType}' but library item is '${libraryItem.type}'.`);
    }


    // FIX: Access 'scheduleEntry' model via this.prisma.scheduleEntry
    const scheduleEntry = await (this.prisma as any).scheduleEntry.create({
      data: {
        organizationId,
        userId: user.id,
        datetime: createScheduleEntryDto.datetime,
        platform: createScheduleEntryDto.platform,
        contentId: createScheduleEntryDto.contentId,
        contentType: createScheduleEntryDto.contentType,
        status: createScheduleEntryDto.status,
      },
    });
    return this.mapToResponseDto(scheduleEntry);
  }

  async findAll(organizationId: string): Promise<ScheduleEntryResponseDto[]> {
    // FIX: Access 'scheduleEntry' model via this.prisma.scheduleEntry
    const scheduleEntries = await (this.prisma as any).scheduleEntry.findMany({
      where: { organizationId },
      orderBy: { datetime: 'asc' }, // Ordenar por data/hora agendada
      include: { libraryItem: true }, // Incluir dados do LibraryItem para exibição
    });
    return scheduleEntries.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<ScheduleEntryResponseDto> {
    // FIX: Access 'scheduleEntry' model via this.prisma.scheduleEntry
    const scheduleEntry = await (this.prisma as any).scheduleEntry.findUnique({
      where: { id, organizationId },
      include: { libraryItem: true },
    });
    if (!scheduleEntry) {
      throw new NotFoundException(`ScheduleEntry with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(scheduleEntry);
  }

  async update(organizationId: string, id: string, updateScheduleEntryDto: UpdateScheduleEntryDto): Promise<ScheduleEntryResponseDto> {
    await this.findOne(organizationId, id); // Check if entry exists

    // Se o contentId for atualizado, revalidar
    if (updateScheduleEntryDto.contentId) {
        const libraryItem = await this.filesService.findOne(organizationId, updateScheduleEntryDto.contentId);
        if (!libraryItem) {
            throw new NotFoundException(`Content ID ${updateScheduleEntryDto.contentId} not found in library.`);
        }
        if (updateScheduleEntryDto.contentType && libraryItem.type !== updateScheduleEntryDto.contentType) {
            throw new BadRequestException(`Content type mismatch for updated content: provided '${updateScheduleEntryDto.contentType}' but library item is '${libraryItem.type}'.`);
        } else if (!updateScheduleEntryDto.contentType) {
            // Se contentId mudou mas contentType não foi especificado, usar o do novo LibraryItem
            updateScheduleEntryDto.contentType = libraryItem.type;
        }
    }


    // FIX: Access 'scheduleEntry' model via this.prisma.scheduleEntry
    const scheduleEntry = await (this.prisma as any).scheduleEntry.update({
      where: { id, organizationId },
      data: {
        datetime: updateScheduleEntryDto.datetime,
        platform: updateScheduleEntryDto.platform,
        contentId: updateScheduleEntryDto.contentId,
        contentType: updateScheduleEntryDto.contentType,
        status: updateScheduleEntryDto.status,
      },
      include: { libraryItem: true },
    });
    return this.mapToResponseDto(scheduleEntry);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id); // Check if entry exists

    // FIX: Access 'scheduleEntry' model via this.prisma.scheduleEntry
    await (this.prisma as any).scheduleEntry.delete({
      where: { id, organizationId },
    });
  }

  private mapToResponseDto(entry: any): ScheduleEntryResponseDto {
    return {
      id: entry.id,
      organizationId: entry.organizationId,
      userId: entry.userId,
      datetime: entry.datetime,
      platform: entry.platform,
      contentId: entry.contentId,
      contentType: entry.contentType,
      status: entry.status,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Incluir detalhes do LibraryItem, se disponível
      libraryItemName: entry.libraryItem?.name,
      libraryItemThumbnailUrl: entry.libraryItem?.thumbnailUrl,
    };
  }
}
