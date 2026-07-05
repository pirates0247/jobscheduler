import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkerStatus, JobStatus } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pruneOfflineWorkers() {
    const cutoff = new Date(Date.now() - 60000);
    const result = await this.prisma.worker.updateMany({
      where: {
        status: WorkerStatus.ONLINE,
        lastHeartbeat: { lt: cutoff },
      },
      data: { status: WorkerStatus.OFFLINE },
    });
    if (result.count > 0) {
      this.logger.log(`Pruned ${result.count} offline worker(s)`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async timeoutRunningJobs() {
    const cutoff = new Date(Date.now() - 300000);
    const timedOut = await this.prisma.job.findMany({
      where: {
        status: { in: [JobStatus.RUNNING, JobStatus.CLAIMED] },
        startedAt: { lt: cutoff },
      },
      include: { queue: true },
    });

    for (const job of timedOut) {
      const timeoutMs = job.queue.jobTimeoutMs ?? 30000;
      const sinceStart = job.startedAt
        ? Date.now() - job.startedAt.getTime()
        : Infinity;
      if (sinceStart < timeoutMs) continue;

      await this.prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          errorMessage: `Job timed out after ${timeoutMs}ms`,
          failedAt: new Date(),
          claimedBy: null,
        },
      });

      await this.prisma.executionLog.create({
        data: {
          jobId: job.id,
          level: 'error' as any,
          message: `Job timed out after ${timeoutMs}ms`,
        },
      });

      this.logger.warn(`Job ${job.id} timed out (queue: ${job.queue.name})`);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async promoteScheduledJobs() {
    const now = new Date();
    const promoted = await this.prisma.job.updateMany({
      where: {
        status: JobStatus.SCHEDULED,
        runAt: { lte: now },
      },
      data: { status: JobStatus.QUEUED },
    });

    if (promoted.count > 0) {
      this.logger.log(`Promoted ${promoted.count} scheduled job(s) to QUEUED`);
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async promoteRetryingJobs() {
    const now = new Date();
    const promoted = await this.prisma.job.updateMany({
      where: {
        status: JobStatus.RETRYING,
        runAt: { lte: now },
      },
      data: { status: JobStatus.QUEUED },
    });

    if (promoted.count > 0) {
      this.logger.log(`Promoted ${promoted.count} retrying job(s) to QUEUED`);
    }
  }
}
