import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { OrganizationRoleGuard } from '../permissions/guards/organization-role.guard';
import { Roles } from '../permissions/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DecodedIdToken } from 'firebase-admin/auth';
import { PostResponseDto } from './dto/post-response.dto';
import { ParseUUIDPipe } from '@nestjs/common';

@ApiTags('Posts')
@Controller('organizations/:organizationId/posts')
@UseGuards(FirebaseAuthGuard, OrganizationRoleGuard)
@ApiBearerAuth('firebase-auth')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new post for the organization' })
  @ApiResponse({ status: 201, description: 'The post has been successfully created.', type: PostResponseDto })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser('uid') firebaseUid: string,
    @Body() createPostDto: CreatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.create(organizationId, firebaseUid, createPostDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get all posts for the organization' })
  @ApiResponse({ status: 200, description: 'List of posts.', type: [PostResponseDto] })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<PostResponseDto[]> {
    return this.postsService.findAll(organizationId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EDITOR, Role.VIEWER)
  @ApiOperation({ summary: 'Get a post by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The post details.', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PostResponseDto> {
    return this.postsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @ApiOperation({ summary: 'Update a post by ID for the organization' })
  @ApiResponse({ status: 200, description: 'The post has been successfully updated.', type: PostResponseDto })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    return this.postsService.update(organizationId, id, updatePostDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a post by ID for the organization' })
  @ApiResponse({ status: 204, description: 'The post has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.postsService.remove(organizationId, id);
  }
}
