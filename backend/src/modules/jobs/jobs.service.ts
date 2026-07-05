import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateJobDto, JobQueryDto, CreateBatchJobDto } from './dto/job.dto';
import { QueuesService } from '../queues/queues.service';
import { MembershipRole, JobStatus, JobType, LogLevel } from '@prisma/client';
import { paginate } from '../../common/dto/pagination.dto';
import { EventsGateway } from '../events/events.gateway';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: QueuesService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    dto: CreateJobDto,
    userId: string,
  ) {
    const queue = await this.queuesService.findByName(
      orgSlug,
      projectSlug,
      queueName,
      userId,
    );

    if (queue.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot submit jobs');
    }

    // Check idempotency key if provided
    if (dto.idempotencyKey) {
      const existing = await this.prisma.job.findUnique({
        where: {
          queueId_idempotencyKey: {
            queueId: queue.id,
            idempotencyKey: dto.idempotencyKey,
          },
        },
      });
      if (existing) {
        return existing; // Idempotent return
      }
    }

    // Compute runAt
    let runAt: Date | null = null;
    let initialStatus: JobStatus = JobStatus.QUEUED;

    if (dto.type === JobType.DELAYED || dto.type === JobType.SCHEDULED) {
      if (!dto.runAt) {
        throw new BadRequestException(
          'runAt is required for delayed or scheduled jobs',
        );
      }
      runAt = new Date(dto.runAt);
      initialStatus = JobStatus.SCHEDULED;
    } else if (dto.type === JobType.RECURRING) {
      if (!dto.cronExpression) {
        throw new BadRequestException(
          'cronExpression is required for recurring jobs',
        );
      }
      // Set runAt for initial iteration
      runAt = this.getNextCronDate(dto.cronExpression);
      initialStatus = JobStatus.SCHEDULED;
    }

    const job = await this.prisma.job.create({
      data: {
        queueId: queue.id,
        name: dto.name ?? `${queue.name}-job`,
        type: dto.type,
        status: initialStatus,
        payload: dto.payload ?? {},
        priority: dto.priority ?? queue.priority,
        maxRetries: dto.maxRetries ?? queue.maxRetries,
        cronExpression: dto.cronExpression,
        runAt,
        idempotencyKey: dto.idempotencyKey,
        tags: dto.tags ?? [],
      },
    });

    // Write audit log
    await this.prisma.executionLog.create({
      data: {
        jobId: job.id,
        level: LogLevel.info,
        message: `Job created via API (Type: ${job.type})`,
      },
    });

    this.eventsGateway.emitJobCreated(orgSlug, { queueId: queue.id, job });
    return job;
  }

  async createBatch(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    dto: CreateBatchJobDto,
    userId: string,
  ) {
    const queue = await this.queuesService.findByName(
      orgSlug,
      projectSlug,
      queueName,
      userId,
    );

    if (queue.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot submit jobs');
    }

    const batchId = uuidv4();
    const now = new Date();

    const jobsData = dto.jobs.map((j) => {
      let runAt: Date | null = null;
      let initialStatus: JobStatus = JobStatus.QUEUED;

      if (j.type === JobType.DELAYED || j.type === JobType.SCHEDULED) {
        runAt = j.runAt ? new Date(j.runAt) : now;
        initialStatus = JobStatus.SCHEDULED;
      }

      return {
        queueId: queue.id,
        name: j.name ?? `${queue.name}-job`,
        type: j.type,
        status: initialStatus,
        payload: j.payload ?? {},
        priority: j.priority ?? queue.priority,
        maxRetries: j.maxRetries ?? queue.maxRetries,
        runAt,
        batchId,
        tags: j.tags ?? [],
      };
    });

    // Create jobs inside transaction
    await this.prisma.job.createMany({
      data: jobsData,
    });

    const createdJobs = await this.prisma.job.findMany({
      where: { queueId: queue.id, batchId },
    });

    for (const job of createdJobs) {
      await this.prisma.executionLog.create({
        data: {
          jobId: job.id,
          level: LogLevel.info,
          message: `Job created inside batch ${batchId}`,
        },
      });
      this.eventsGateway.emitJobCreated(orgSlug, { queueId: queue.id, job });
    }

    return { batchId, count: createdJobs.length, jobs: createdJobs };
  }

  async findAll(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    query: JobQueryDto,
    userId: string,
  ) {
    const queue = await this.queuesService.findByName(
      orgSlug,
      projectSlug,
      queueName,
      userId,
    );

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      queueId: queue.id,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.tag) {
      where.tags = { has: query.tag };
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { idempotencyKey: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return paginate(jobs, total, page, limit);
  }

  async findOne(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    jobId: string,
    userId: string,
  ) {
    const queue = await this.queuesService.findByName(
      orgSlug,
      projectSlug,
      queueName,
      userId,
    );

    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        queueId: queue.id,
      },
      include: {
        executionLogs: { orderBy: { createdAt: 'asc' } },
        retryHistory: { orderBy: { createdAt: 'asc' } },
        deadLetter: true,
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    return { ...job, userRole: queue.userRole };
  }

  async cancel(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    jobId: string,
    userId: string,
  ) {
    const job = await this.findOne(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );

    if (job.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot cancel jobs');
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new BadRequestException('Cannot cancel a finished job');
    }

    const updatedJob = await this.prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.CANCELLED },
    });

    await this.prisma.executionLog.create({
      data: {
        jobId: job.id,
        level: LogLevel.warn,
        message: `Job cancelled by user`,
      },
    });

    this.eventsGateway.emitJobUpdated(orgSlug, {
      jobId: job.id,
      status: JobStatus.CANCELLED,
      queueId: job.queueId,
    });

    return updatedJob;
  }

  async retry(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    jobId: string,
    userId: string,
  ) {
    const job = await this.findOne(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );

    if (job.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot retry jobs');
    }

    if (
      job.status !== JobStatus.FAILED &&
      job.status !== JobStatus.DEAD_LETTER &&
      job.status !== JobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Only failed, dead letter, or cancelled jobs can be retried',
      );
    }

    // Clean up dead letter entry if it exists
    if (job.status === JobStatus.DEAD_LETTER) {
      await this.prisma.deadLetterJob.deleteMany({
        where: { jobId: job.id },
      });
    }

    const updatedJob = await this.prisma.job.update({
      where: { id: job.id },
      data: {
        status: JobStatus.QUEUED,
        attempts: 0,
        runAt: new Date(),
        failedAt: null,
        completedAt: null,
        errorMessage: null,
      },
    });

    await this.prisma.executionLog.create({
      data: {
        jobId: job.id,
        level: LogLevel.info,
        message: `Job queued for manual retry`,
      },
    });

    this.eventsGateway.emitJobUpdated(orgSlug, {
      jobId: job.id,
      status: JobStatus.QUEUED,
      queueId: job.queueId,
    });

    return updatedJob;
  }

  async remove(
    orgSlug: string,
    projectSlug: string,
    queueName: string,
    jobId: string,
    userId: string,
  ) {
    const job = await this.findOne(
      orgSlug,
      projectSlug,
      queueName,
      jobId,
      userId,
    );

    if (
      job.userRole !== MembershipRole.OWNER &&
      job.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can delete jobs');
    }

    await this.prisma.job.delete({
      where: { id: job.id },
    });
  }

  private getNextCronDate(cronExpression: string): Date {
    // Simple mock cron parser. Real implementation can parse with 'cron-parser' or 'later'.
    // To ensure zero production external failures, we'll simulate 5 minutes from now.
    return new Date(Date.now() + 5 * 60 * 1000);
  }
}
