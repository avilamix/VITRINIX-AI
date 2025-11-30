
/// <reference types="node" />

import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'buffer'; // FIX: Explicitly import Buffer

@Injectable()
export class GoogleCloudStorageService {
  private readonly logger = new Logger(GoogleCloudStorageService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('GCP_STORAGE_BUCKET_NAME');
    if (!this.bucketName) {
      this.logger.error('GCP_STORAGE_BUCKET_NAME is not configured in environment variables.');
      throw new Error('Google Cloud Storage bucket name is not configured.');
    }
    
    // Google Cloud Storage will automatically pick up credentials from
    // GOOGLE_APPLICATION_CREDENTIALS environment variable or default GKE/GCE metadata.
    this.storage = new Storage();
    this.logger.log(`Google Cloud Storage initialized for bucket: ${this.bucketName}`);
  }

  async uploadFile(fileBuffer: any, destinationFileName: string, contentType: string): Promise<string> { // FIX: Use any for fileBuffer
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Cannot upload an empty file.');
    }

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(destinationFileName);

    try {
      await file.save(fileBuffer, {
        contentType,
        resumable: false, // For smaller files, direct upload is fine
        public: true, // Make the file publicly accessible
      });

      // Construct public URL. Format: https://storage.googleapis.com/<bucket-name>/<file-name>
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${destinationFileName}`;
      this.logger.log(`File ${destinationFileName} uploaded to GCS: ${publicUrl}`);
      return publicUrl;
    } catch (error: any) { // Cast error to any
      this.logger.error(`Failed to upload file ${destinationFileName} to GCS: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to upload file to storage.`);
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    try {
      await file.delete();
      this.logger.log(`File ${fileName} deleted from GCS.`);
    } catch (error: any) { // Cast error to any
      // If the file does not exist, GCS returns a 404, which is fine for deletion.
      if (error.code === 404) {
        this.logger.warn(`Attempted to delete non-existent file ${fileName} from GCS.`);
        return;
      }
      this.logger.error(`Failed to delete file ${fileName} from GCS: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`Failed to delete file from storage.`);
    }
  }

  // Helper to check if a URL is a GCS public URL
  isGcsUrl(url: string): boolean {
    return url.startsWith(`https://storage.googleapis.com/${this.bucketName}/`);
  }

  // Helper to extract file path from a GCS public URL
  getFilePathFromUrl(url: string): string {
    const baseUrl = `https://storage.googleapis.com/${this.bucketName}/`;
    if (!url.startsWith(baseUrl)) {
      throw new BadRequestException(`URL is not a valid GCS URL for bucket ${this.bucketName}.`);
    }
    return url.substring(baseUrl.length);
  }
}
