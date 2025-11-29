import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { PostResponseDto } from './dto/post-response.dto';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async create(organizationId: string, firebaseUid: string, createPostDto: CreatePostDto): Promise<PostResponseDto> {
    const user = await this.authService.getUserByFirebaseUid(firebaseUid);
    if (!user) {
      throw new NotFoundException(`User with Firebase UID ${firebaseUid} not found.`);
    }

    // FIX: Access 'post' model via this.prisma.post
    const post = await this.prisma.post.create({
      data: {
        organizationId,
        userId: user.id,
        contentText: createPostDto.contentText,
        imageUrl: createPostDto.imageUrl,
        tags: createPostDto.tags || [],
      },
    });
    return this.mapToResponseDto(post);
  }

  async findAll(organizationId: string): Promise<PostResponseDto[]> {
    // FIX: Access 'post' model via this.prisma.post
    const posts = await this.prisma.post.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return posts.map(this.mapToResponseDto);
  }

  async findOne(organizationId: string, id: string): Promise<PostResponseDto> {
    // FIX: Access 'post' model via this.prisma.post
    const post = await this.prisma.post.findUnique({
      where: { id, organizationId },
    });
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found in organization ${organizationId}.`);
    }
    return this.mapToResponseDto(post);
  }

  async update(organizationId: string, id: string, updatePostDto: UpdatePostDto): Promise<PostResponseDto> {
    await this.findOne(organizationId, id); // Check if post exists

    // FIX: Access 'post' model via this.prisma.post
    const post = await this.prisma.post.update({
      where: { id, organizationId },
      data: {
        contentText: updatePostDto.contentText,
        imageUrl: updatePostDto.imageUrl,
        tags: updatePostDto.tags,
      },
    });
    return this.mapToResponseDto(post);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.findOne(organizationId, id); // Check if post exists

    // FIX: Access 'post' model via this.prisma.post
    await this.prisma.post.delete({
      where: { id, organizationId },
    });
  }

  private mapToResponseDto(post: any): PostResponseDto {
    return {
      id: post.id,
      organizationId: post.organizationId,
      userId: post.userId,
      contentText: post.contentText,
      imageUrl: post.imageUrl,
      tags: post.tags,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}