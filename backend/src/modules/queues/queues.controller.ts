import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Queues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgSlug/projects/:projectSlug/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new queue in a project' })
  async create(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Body() dto: CreateQueueDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.create(orgSlug, projectSlug, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all queues in a project' })
  async findAll(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.findAll(orgSlug, projectSlug, userId);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get details of a queue' })
  async findOne(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.findByName(orgSlug, projectSlug, name, userId);
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update queue details' })
  async update(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @Body() dto: UpdateQueueDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.update(orgSlug, projectSlug, name, dto, userId);
  }

  @Post(':name/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause a queue' })
  async pause(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.pause(orgSlug, projectSlug, name, userId);
  }

  @Post(':name/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume a paused queue' })
  async resume(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.resume(orgSlug, projectSlug, name, userId);
  }

  @Get(':name/stats')
  @ApiOperation({ summary: 'Get job statistics for a queue' })
  async getStats(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.queuesService.getStats(orgSlug, projectSlug, name, userId);
  }

  @Delete(':name')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a queue' })
  async remove(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('name') name: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.queuesService.delete(orgSlug, projectSlug, name, userId);
  }
}
