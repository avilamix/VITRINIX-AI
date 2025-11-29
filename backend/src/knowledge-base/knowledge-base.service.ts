
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DecodedIdToken } from 'firebase-admin/auth';
import { GeminiConfigService } from '../config/gemini.config';
import { ApiKeysService } from '../api-keys/api-keys.service';
// Corrected import from GoogleGenerativeAI
import { GoogleGenAI, File as GenAIFile, GenerateContentRequest } from '@google/genai'; 
import { FileSearchStoreResponseDto } from './dto/create-store.dto';
import { ListFilesResponseDto, UploadFileResponseDto } from './dto/upload-file.dto';
import { QueryKnowledgeBaseResponseDto } from './dto/query-store.dto';
import { AuthService } from '../auth/auth.service';
import { OrganizationsService } from '../organizations/organizations.service'; // Importar OrganizationsService
import { AiProxyService } from '../ai-proxy/ai-proxy.service'; // Importar AiProxyService
import { File } from '@prisma/client';
import { MetadataDto } from './dto/metadata.dto';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  // Tamanhos máximos de arquivo suportados pelo Gemini File Search (aprox.)
  private readonly MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

  constructor(
    private prisma: PrismaService,
    private geminiConfigService: GeminiConfigService,
    private apiKeysService: ApiKeysService,
    private authService: AuthService,
    private organizationsService: OrganizationsService, // Injetar OrganizationsService
    private aiProxyService: AiProxyService, // Injetar AiProxyService
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

    // Criar o store no Gemini via AiProxyService
    const store = await this.aiProxyService.createGeminiFileSearchStore(
      organizationId,
      firebaseUid,
      displayName || `Organization ${organization.name} KB`,
    );

    // Salvar o nome do store no DB da Organization
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
    file: Express.Multer.File, // @ts-ignore Assuming @types/express is installed
    metadata: MetadataDto, // Metadados do DTO
  ): Promise<UploadFileResponseDto> {
    const organization = await this.organizationsService.getOrganizationById(organizationId);
    if (!organization.fileSearchStoreName) {
      throw new BadRequestException('File Search Store not configured for this organization. Please create one first.');
    }

    const user = await this.authService.getUserByFirebaseUid(firebaseUid);

    // Validação básica do arquivo (tamanho e tipo já são filtrados por MulterOptions)
    if (!file || file.size === 0) {
      throw new BadRequestException('File is empty.');
    }

    // Upload para Gemini Files API via AiProxyService
    const geminiFile = await this.aiProxyService.uploadFileToGeminiFiles(
      organizationId,
      firebaseUid,
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    
    // Adicionar arquivo ao File Search Store via AiProxyService
    await this.aiProxyService.addFileToGeminiFileSearchStore(
      organizationId,
      firebaseUid,
      organization.fileSearchStoreName,
      geminiFile.name,
      // chunkingConfig: { maxTokensPerChunk: 200, overlap: 20 }, // Pode ser configurável via DTO
    );

    // Salvar metadados do arquivo no DB
    // @ts-ignore
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
    // TODO: Adicionar filtro por originalName (LIKE)

    // @ts-ignore
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
    // @ts-ignore
    const fileToDelete = await this.prisma.file.findUnique({
      where: { id: fileId, organizationId },
    });

    if (!fileToDelete) {
      throw new NotFoundException(`File with ID ${fileId} not found in this organization's knowledge base.`);
    }
    if (!fileToDelete.geminiFileId) {
      this.logger.warn(`File ${fileId} found in DB but no geminiFileId. Deleting from DB only.`);
      // @ts-ignore
      await this.prisma.file.delete({ where: { id: fileId } });
      return;
    }

    // Excluir do Gemini Files API via AiProxyService
    await this.aiProxyService.deleteGeminiFile(organizationId, firebaseUid, fileToDelete.geminiFileId);
    
    // Excluir do nosso DB
    // @ts-ignore
    await this.prisma.file.delete({ where: { id: fileId } });
    this.logger.log(`File ${fileToDelete.originalName} (DB ID: ${fileId}) successfully deleted from Gemini and DB.`);
  }

  // --- Consulta ao File Search Store ---
  async queryFileSearchStore(
    organizationId: string,
    firebaseUid: string,
    prompt: string,
    model: string = 'gemini-1.5-flash',
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

    const textResponse = response.text() || 'No answer found based on your documents.';
    const groundingMetadata = response.groundingMetadata;

    const filesUsed: string[] = [];
    const referencedSnippets: string[] = [];
    let confidence = 0.0;

    if (groundingMetadata && groundingMetadata.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.retrievedFile && chunk.retrievedFile.uri) {
          // Extrair o nome do arquivo do URI do Gemini File (ex: "files/12345")
          const geminiFileId = chunk.retrievedFile.uri.split('/').pop();
          // @ts-ignore
          const dbFile = await this.prisma.file.findFirst({
            where: { geminiFileId, organizationId },
            select: { originalName: true },
          });
          if (dbFile && !filesUsed.includes(dbFile.originalName)) {
            filesUsed.push(dbFile.originalName);
          }
        }
        if (chunk.retrievedSegment && chunk.retrievedSegment.text) {
          referencedSnippets.push(chunk.retrievedSegment.text);
        }
      }
      // Se houver grounding, atribui uma confiança básica
      if (filesUsed.length > 0 || referencedSnippets.length > 0) {
        confidence = 0.8; 
      }
    }
    
    // Fallback explícito se não houver grounding mas a resposta Gemini for vaga
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