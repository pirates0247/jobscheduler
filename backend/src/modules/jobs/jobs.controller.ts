import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, JobQueryDto, CreateBatchJobDto } from './dto/job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(
  'organizations/:orgSlug/projects/:projectSlug/queues/:queueName/jobs',
)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new job to a queue' })
  async create(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Body() dto: CreateJobDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.create(
      orgSlug,
      projectSlug,
      queueName,
      dto,
      userId,
    );
  }

  @Post('batch')
  @ApiOperation({ summary: 'Submit a batch of jobs to a queue' })
  async createBatch(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Body() dto: CreateBatchJobDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.createBatch(
      orgSlug,
      projectSlug,
      queueName,
      dto,
      userId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated list of jobs in a queue' })
  async findAll(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Query() query: JobQueryDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.findAll(
      orgSlug,
      projectSlug,
      queueName,
      query,
      userId,
    );
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Get details, logs, and history of a job' })
  async findOne(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.findOne(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );
  }

  @Post(':jobId/cancel')
  @ApiOperation({ summary: 'Cancel a pending or running job' })
  async cancel(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.cancel(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );
  }

  @Post(':jobId/retry')
  @ApiOperation({ summary: 'Manually retry a failed or dead letter job' })
  async retry(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.retry(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a job from history' })
  async remove(
    @Param('orgSlug') orgSlug: string,
    @Param('projectSlug') projectSlug: string,
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.jobsService.remove(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );
  }
}
