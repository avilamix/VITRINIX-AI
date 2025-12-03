
import { Injectable, BadRequestException, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecodedIdToken } from 'firebase-admin/auth';
import { GeminiConfigService } from '../config/gemini.config';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { GoogleGenAI, GenerateContentParameters } from '@google/genai'; 
import { FileSearchStoreResponseDto } from './dto/create-store.dto';
import { ListFilesResponseDto, UploadFileResponseDto } from './dto/upload-file.dto';
import { QueryKnowledgeBaseResponseDto } from './dto/query-store.dto';
import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AiProxyService } from '../ai-proxy/ai-proxy.service';
import { MetadataDto } from './dto/metadata.dto';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  constructor(
    private prisma: PrismaService,
    private geminiConfigService: GeminiConfigService,
    private apiKeysService: ApiKeysService,
    private authService: AuthService,
    private organizationsService: OrganizationsService,
    private aiProxyService: AiProxyService,
  ) {}

  // --- Gerenciamento de File Search Store ---
  async findOrCreateFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    displayName?: string,
  ): Promise<FileSearchStoreResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);

    if (organization.fileSearchStoreName) {
      this.logger.log(`Organization ${organizationId} already has a File Search Store: ${organization.fileSearchStoreName}`);
      return { storeName: organization.fileSearchStoreName, displayName: organization.name };
    }

    const store = await this.aiProxyService.createGeminiFileSearchStore(
      organizationId,
      firebaseUid,
      displayName || `Organization ${organization.name} KB`,
    );

    await this.organizationsService.updateOrganizationFileSearchStoreName(organizationId, store.name);

    this.logger.log(`New File Search Store created: ${store.name} for organization ${organizationId}`);
    return { storeName: store.name, displayName: store.displayName };
  }

  async getFileSearchStore(organizationId: string): Promise<FileSearchStoreResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);

    if (!organization.fileSearchStoreName) {
      throw new NotFoundException('File Search Store not found for this organization. Please create one.');
    }
    return { storeName: organization.fileSearchStoreName, displayName: organization.name };
  }

  // --- Upload de Arquivos ---
  async uploadFileAndAddToStore(
    organizationId: string,
    firebaseUid: string,
    file: any,
    metadata: MetadataDto,
  ): Promise<UploadFileResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);
    if (!organization.fileSearchStoreName) {
      throw new BadRequestException('File Search Store not configured for this organization. Please create one first.');
    }

    const user = await this.authService.getUserByFirebaseUid(firebaseUid);

    if (!file || file.size === 0) {
      throw new BadRequestException('File is empty.');
    }

    const geminiFile = await this.aiProxyService.uploadFileToGeminiFiles(
      organizationId,
      firebaseUid,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    
    await this.aiProxyService.addFileToGeminiFileSearchStore(
      organizationId,
      firebaseUid,
      organization.fileSearchStoreName,
      geminiFile.name,
    );

    const newFileEntry = await this.prisma.file.create({
      data: {
        organizationId,
        uploadedByUserId: user.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        geminiFileId: geminiFile.name,
        geminiFileDisplayName: geminiFile.displayName,
        geminiFileStatus: geminiFile.state,
        documentType: metadata.documentType,
        campaign: metadata.campaign,
        sector: metadata.sector,
        client: metadata.client,
      },
    });

    this.logger.log(`File '${file.originalname}' uploaded and indexed successfully for org ${organizationId}. DB ID: ${newFileEntry.id}`);
    return {
      fileId: newFileEntry.id,
      originalName: newFileEntry.originalName,
      mimeType: newFileEntry.mimeType,
      size: newFileEntry.size,
      geminiFileId: newFileEntry.geminiFileId,
      geminiFileStatus: newFileEntry.geminiFileStatus,
      documentType: newFileEntry.documentType,
      campaign: newFileEntry.campaign,
      sector: newFileEntry.sector,
      client: newFileEntry.client,
    };
  }

  // --- Listagem de Arquivos (do nosso DB com filtros de metadados) ---
  async listFiles(organizationId: string, filters: MetadataDto): Promise<ListFilesResponseDto[]> {
    const whereClause: any = { organizationId };

    if (filters.documentType) whereClause.documentType = filters.documentType;
    if (filters.campaign) whereClause.campaign = filters.campaign;
    if (filters.sector) whereClause.sector = filters.sector;
    if (filters.client) whereClause.client = filters.client;

    const files = await this.prisma.file.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      geminiFileId: file.geminiFileId,
      geminiFileStatus: file.geminiFileStatus,
      createdAt: file.createdAt,
      documentType: file.documentType,
      campaign: file.campaign,
      sector: file.sector,
      client: file.client,
    }));
  }

  // --- Exclusão de Arquivos ---
  async deleteFile(organizationId: string, fileId: string, firebaseUid: string): Promise<void> {
    const fileToDelete = await this.prisma.file.findUnique({
      where: { id: fileId, organizationId },
    });

    if (!fileToDelete) {
      throw new NotFoundException(`File with ID ${fileId} not found in this organization's knowledge base.`);
    }
    if (!fileToDelete.geminiFileId) {
      this.logger.warn(`File ${fileId} found in DB but no geminiFileId. Deleting from DB only.`);
      await this.prisma.file.delete({ where: { id: fileId } });
      return;
    }

    await this.aiProxyService.deleteGeminiFile(organizationId, firebaseUid, fileToDelete.geminiFileId);
    
    await this.prisma.file.delete({ where: { id: fileId } });
    this.logger.log(`File ${fileToDelete.originalName} (DB ID: ${fileId}) successfully deleted from Gemini and DB.`);
  }

  // --- Consulta ao File Search Store ---
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string = this.geminiConfigService.DEFAULT_GENERATION_CONFIG.model,
  ): Promise<QueryKnowledgeBaseResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);
    if (!organization.fileSearchStoreName) {
      throw new BadRequestException('File Search Store not configured for this organization. Cannot query.');
    }

    const response = await this.aiProxyService.queryFileSearchStore(
      organizationId,
      firebaseUid,
      organization.fileSearchStoreName,
      prompt,
      model,
    );

    const textResponse = response.text || 'No answer found based on your documents.';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    const filesUsed: string[] = [];
    const referencedSnippets: string[] = [];
    let confidence = 0.0;

    if (groundingMetadata && groundingMetadata.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        const anyChunk = chunk as any;
        
        if (anyChunk.retrievedFile && anyChunk.retrievedFile.uri) {
          const geminiFileId = anyChunk.retrievedFile.uri.split('/').pop();
          const dbFile = await this.prisma.file.findFirst({
            where: { geminiFileId, organizationId },
            select: { originalName: true },
          });
          if (dbFile && !filesUsed.includes(dbFile.originalName)) {
            filesUsed.push(dbFile.originalName);
          }
        }
        if (anyChunk.retrievedSegment && anyChunk.retrievedSegment.text) {
          referencedSnippets.push(anyChunk.retrievedSegment.text);
        }
      }
      if (filesUsed.length > 0 || referencedSnippets.length > 0) {
        confidence = 0.8; 
      }
    }
    
    if (confidence === 0.0 && textResponse.toLowerCase().includes('no relevant information')) {
      return {
        resposta: "Não foi possível encontrar informações relevantes nos documentos da sua base de conhecimento para responder a esta pergunta.",
        arquivos_usados: [],
        trechos_referenciados: [],
        confianca: 0.1,
      };
    }

    return {
      resposta: textResponse,
      arquivos_usados: filesUsed,
      trechos_referenciados: referencedSnippets,
      confianca: confidence,
    };
  }
}
