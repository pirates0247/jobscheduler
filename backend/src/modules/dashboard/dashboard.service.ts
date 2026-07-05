import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { JobStatus, WorkerStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgsService: OrganizationsService,
  ) {}

  async getMetrics(orgSlug: string, userId: string) {
    const org = await this.orgsService.findBySlug(orgSlug, userId);

    // Find all projects in the organization
    const projects = await this.prisma.project.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    // Find all queues in these projects
    const queues = await this.prisma.queue.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });

    const queueIds = queues.map((q) => q.id);

    // Group jobs by status
    const jobsByStatus = await this.prisma.job.groupBy({
      by: ['status'],
      where: { queueId: { in: queueIds } },
      _count: { _all: true },
    });

    const stats = {
      TOTAL: 0,
      QUEUED: 0,
      SCHEDULED: 0,
      CLAIMED: 0,
      RUNNING: 0,
      COMPLETED: 0,
      RETRYING: 0,
      FAILED: 0,
      DEAD_LETTER: 0,
      CANCELLED: 0,
    };

    let totalJobs = 0;
    for (const group of jobsByStatus) {
      if (group.status in stats) {
        stats[group.status] = group._count._all;
        totalJobs += group._count._all;
      }
    }
    stats.TOTAL = totalJobs;

    // Active workers
    const activeWorkers = await this.prisma.worker.count({
      where: { status: WorkerStatus.ONLINE },
    });

    // Average processing time of completed jobs in this organization
    const completedJobs = await this.prisma.job.findMany({
      where: {
        queueId: { in: queueIds },
        status: JobStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      take: 100, // sample of last 100 jobs
      orderBy: { completedAt: 'desc' },
    });

    let avgProcessingTimeMs = 0;
    if (completedJobs.length > 0) {
      const sum = completedJobs.reduce((acc, job) => {
        return acc + (job.completedAt!.getTime() - job.startedAt!.getTime());
      }, 0);
      avgProcessingTimeMs = Math.round(sum / completedJobs.length);
    }

    // Throughput data (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const throughput = await this.prisma.job.groupBy({
      by: ['status', 'createdAt'],
      where: {
        queueId: { in: queueIds },
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { _all: true },
    });

    // Format throughput data into daily buckets
    const dailyThroughput: Record<
      string,
      { completed: number; failed: number }
    > = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyThroughput[dateStr] = { completed: 0, failed: 0 };
    }

    for (const entry of throughput) {
      const dateStr = entry.createdAt.toISOString().split('T')[0];
      if (dateStr in dailyThroughput) {
        if (entry.status === JobStatus.COMPLETED) {
          dailyThroughput[dateStr].completed += entry._count._all;
        } else if (
          entry.status === JobStatus.FAILED ||
          entry.status === JobStatus.DEAD_LETTER
        ) {
          dailyThroughput[dateStr].failed += entry._count._all;
        }
      }
    }

    const charts = Object.entries(dailyThroughput)
      .map(([date, counts]) => ({
        date,
        completed: counts.completed,
        failed: counts.failed,
      }))
      .reverse();

    return {
      stats,
      activeWorkers,
      avgProcessingTimeMs,
      charts,
    };
  }
}
