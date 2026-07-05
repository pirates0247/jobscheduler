import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RegisterWorkerDto,
  HeartbeatWorkerDto,
  ClaimJobsDto,
  CompleteJobDto,
  FailJobDto,
} from './dto/worker.dto';
import { WorkerStatus, JobStatus, LogLevel, JobType } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async register(dto: RegisterWorkerDto) {
    const worker = await this.prisma.worker.create({
      data: {
        name: dto.name,
        hostname: dto.hostname,
        ipAddress: dto.ipAddress,
        concurrency: dto.concurrency ?? 5,
        queues: dto.queues ?? [],
        status: WorkerStatus.ONLINE,
        lastHeartbeat: new Date(),
        version: dto.version,
        metadata: dto.metadata ?? {},
      },
    });

    await this.prisma.workerHeartbeat.create({
      data: {
        workerId: worker.id,
        activeJobs: 0,
      },
    });

    this.eventsGateway.emitWorkerHeartbeat({
      workerId: worker.id,
      name: worker.name,
      status: WorkerStatus.ONLINE,
    });

    return worker;
  }

  async heartbeat(id: string, dto: HeartbeatWorkerDto) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    const updated = await this.prisma.worker.update({
      where: { id },
      data: {
        status: WorkerStatus.ONLINE,
        lastHeartbeat: new Date(),
      },
    });

    await this.prisma.workerHeartbeat.create({
      data: {
        workerId: id,
        activeJobs: dto.activeJobs ?? 0,
        memoryMb: dto.memoryMb,
        cpuPct: dto.cpuPct,
      },
    });

    this.eventsGateway.emitWorkerHeartbeat({
      workerId: id,
      name: worker.name,
      status: WorkerStatus.ONLINE,
    });

    return updated;
  }

  async claimJobs(workerId: string, dto: ClaimJobsDto) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!worker) throw new NotFoundException('Worker not found');

    // Make sure we have active queues
    if (dto.queueIds.length === 0) {
      return [];
    }

    const limit = dto.limit ?? worker.concurrency;
    const now = new Date();

    // Perform atomic claim using PostgreSQL's SKIP LOCKED
    // This prevents concurrency race conditions when multiple workers poll at the same time
    return this.prisma.$transaction(async (tx) => {
      const availableJobs: any[] = await tx.$queryRawUnsafe(`
        SELECT j.id FROM jobs j
        JOIN queues q ON j.queue_id = q.id
        WHERE j.queue_id IN (${dto.queueIds.map((id) => `'${id}'`).join(',')})
          AND q.status = 'ACTIVE'
          AND j.status IN ('QUEUED', 'SCHEDULED')
          AND (j.run_at IS NULL OR j.run_at <= NOW())
        ORDER BY q.priority DESC, j.priority DESC, j.created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `);

      if (availableJobs.length === 0) {
        return [];
      }

      const jobIds = availableJobs.map((j) => j.id);

      await tx.job.updateMany({
        where: { id: { in: jobIds } },
        data: {
          status: JobStatus.RUNNING,
          claimedBy: workerId,
          claimedAt: now,
          startedAt: now,
        },
      });

      // Get full job objects to return
      const claimed = await tx.job.findMany({
        where: { id: { in: jobIds } },
        include: {
          queue: {
            include: {
              project: {
                include: {
                  organization: true,
                },
              },
            },
          },
        },
      });

      // Create logs
      for (const job of claimed) {
        await tx.executionLog.create({
          data: {
            jobId: job.id,
            workerId,
            level: LogLevel.info,
            message: `Job claimed and started execution on worker ${worker.name}`,
          },
        });

        // Emit real-time update
        this.eventsGateway.emitJobUpdated(job.queue.project.organization.slug, {
          jobId: job.id,
          status: JobStatus.RUNNING,
          queueId: job.queueId,
        });
      }

      return claimed;
    });
  }

  async completeJob(workerId: string, jobId: string, dto: CompleteJobDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        queue: {
          include: {
            project: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.claimedBy !== workerId) {
      throw new BadRequestException('Job is claimed by another worker');
    }

    const now = new Date();

    const updatedJob = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        completedAt: now,
        result: dto.result ?? {},
      },
    });

    await this.prisma.executionLog.create({
      data: {
        jobId,
        workerId,
        level: LogLevel.info,
        message: 'Job completed successfully',
        metadata: dto.result,
      },
    });

    // Handle recurring job rescheduling
    if (job.type === JobType.RECURRING && job.cronExpression) {
      const nextRun = this.getNextCronDate(job.cronExpression);
      await this.prisma.job.create({
        data: {
          queueId: job.queueId,
          name: job.name,
          type: JobType.RECURRING,
          status: JobStatus.SCHEDULED,
          payload: job.payload ?? {},
          priority: job.priority,
          maxRetries: job.maxRetries,
          cronExpression: job.cronExpression,
          runAt: nextRun,
          tags: job.tags,
        },
      });
    }

    this.eventsGateway.emitJobUpdated(job.queue.project.organization.slug, {
      jobId,
      status: JobStatus.COMPLETED,
      queueId: job.queueId,
    });

    return updatedJob;
  }

  async failJob(workerId: string, jobId: string, dto: FailJobDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        queue: {
          include: {
            project: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');
    if (job.claimedBy !== workerId) {
      throw new BadRequestException('Job is claimed by another worker');
    }

    const now = new Date();
    const nextAttempt = job.attempts + 1;
    const isRetryAvailable = nextAttempt <= job.maxRetries;

    let delayMs = job.queue.baseRetryDelayMs;
    if (job.queue.retryStrategy === 'LINEAR') {
      delayMs = job.queue.baseRetryDelayMs * nextAttempt;
    } else if (job.queue.retryStrategy === 'EXPONENTIAL') {
      delayMs = job.queue.baseRetryDelayMs * Math.pow(2, nextAttempt - 1);
    }

    const nextRunAt = new Date(now.getTime() + delayMs);

    return this.prisma.$transaction(async (tx) => {
      if (isRetryAvailable) {
        const updated = await tx.job.update({
          where: { id: jobId },
          data: {
            status: JobStatus.RETRYING,
            attempts: nextAttempt,
            errorMessage: dto.errorMessage,
            runAt: nextRunAt,
            claimedBy: null,
            claimedAt: null,
          },
        });

        await tx.retryHistory.create({
          data: {
            jobId,
            attempt: nextAttempt,
            reason: dto.errorMessage,
            errorStack: dto.errorStack,
            delayMs,
            scheduledAt: nextRunAt,
          },
        });

        await tx.executionLog.create({
          data: {
            jobId,
            workerId,
            level: LogLevel.warn,
            message: `Job failed. Scheduling attempt #${nextAttempt} in ${delayMs}ms. Error: ${dto.errorMessage}`,
          },
        });

        this.eventsGateway.emitJobUpdated(job.queue.project.organization.slug, {
          jobId,
          status: JobStatus.RETRYING,
          queueId: job.queueId,
        });

        return updated;
      } else {
        // Exceeded retries, transition to DEAD_LETTER or FAILED
        const updated = await tx.job.update({
          where: { id: jobId },
          data: {
            status: JobStatus.DEAD_LETTER,
            attempts: nextAttempt,
            errorMessage: dto.errorMessage,
            failedAt: now,
            claimedBy: null,
          },
        });

        await tx.deadLetterJob.create({
          data: {
            jobId,
            reason: dto.errorMessage,
            payload: job.payload ?? {},
          },
        });

        await tx.executionLog.create({
          data: {
            jobId,
            workerId,
            level: LogLevel.error,
            message: `Job failed and moved to Dead Letter Queue. Error: ${dto.errorMessage}`,
          },
        });

        this.eventsGateway.emitJobUpdated(job.queue.project.organization.slug, {
          jobId,
          status: JobStatus.DEAD_LETTER,
          queueId: job.queueId,
        });

        return updated;
      }
    });
  }

  async findAll() {
    return this.prisma.worker.findMany({
      orderBy: { lastHeartbeat: 'desc' },
      include: {
        heartbeats: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findOneWorker(id: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id },
      include: {
        heartbeats: {
          take: 30,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!worker) throw new NotFoundException('Worker not found');
    return worker;
  }

  async remove(id: string) {
    await this.prisma.worker.delete({
      where: { id },
    });
  }

  // Cron cleanup of dead workers (offline for > 60 seconds)
  async pruneOfflineWorkers() {
    const cutoff = new Date(Date.now() - 60000);
    const affected = await this.prisma.worker.updateMany({
      where: {
        status: WorkerStatus.ONLINE,
        lastHeartbeat: { lt: cutoff },
      },
      data: {
        status: WorkerStatus.OFFLINE,
      },
    });
    return affected;
  }

  private getNextCronDate(cronExpression: string): Date {
    // Basic mock parser
    return new Date(Date.now() + 5 * 60 * 1000);
  }
}
