import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgSlug/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project in organization' })
  async create(
    @Param('orgSlug') orgSlug: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.create(orgSlug, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of projects in organization' })
  async findAll(
    @Param('orgSlug') orgSlug: string,
    @Query() query: PaginationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.findAll(orgSlug, query, userId);
  }

  @Get(':projectSlug')
  @ApiOperation({ summary: 'Get details of a project in organization' })
  async findOne(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.findBySlug(orgSlug, projectSlug, userId);
  }

  @Put(':projectSlug')
  @ApiOperation({ summary: 'Update project details' })
  async update(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.update(orgSlug, projectSlug, dto, userId);
  }

  @Delete(':projectSlug')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a project' })
  async remove(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.projectsService.delete(orgSlug, projectSlug, userId);
  }
}
