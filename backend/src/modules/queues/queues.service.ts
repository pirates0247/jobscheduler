import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQueueDto, UpdateQueueDto } from './dto/queue.dto';
import { ProjectsService } from '../projects/projects.service';
import { MembershipRole, QueueStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class QueuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(
    orgSlug: string,
    projectSlug: string,
    dto: CreateQueueDto,
    userId: string,
  ) {
    const project = await this.projectsService.findBySlug(
      orgSlug,
      projectSlug,
      userId,
    );

    if (project.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot create queues');
    }

    const existing = await this.prisma.queue.findFirst({
      where: {
        projectId: project.id,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Queue with this name already exists in the project',
      );
    }

    return this.prisma.queue.create({
      data: {
        name: dto.name,
        description: dto.description,
        priority: dto.priority ?? 0,
        concurrencyLimit: dto.concurrencyLimit ?? 5,
        retryStrategy: dto.retryStrategy ?? 'EXPONENTIAL',
        maxRetries: dto.maxRetries ?? 3,
        baseRetryDelayMs: dto.baseRetryDelayMs ?? 1000,
        jobTimeoutMs: dto.jobTimeoutMs ?? 30000,
        projectId: project.id,
      },
    });
  }

  async findAll(orgSlug: string, projectSlug: string, userId: string) {
    const project = await this.projectsService.findBySlug(
      orgSlug,
      projectSlug,
      userId,
    );

    return this.prisma.queue.findMany({
      where: { projectId: project.id },
      orderBy: { priority: 'desc' },
    });
  }

  async findByName(
    orgSlug: string,
    projectSlug: string,
    name: string,
    userId: string,
  ) {
    const project = await this.projectsService.findBySlug(
      orgSlug,
      projectSlug,
      userId,
    );

    const queue = await this.prisma.queue.findFirst({
      where: {
        projectId: project.id,
        name,
      },
    });

    if (!queue) throw new NotFoundException('Queue not found');

    return { ...queue, userRole: project.userRole };
  }

  async update(
    orgSlug: string,
    projectSlug: string,
    name: string,
    dto: UpdateQueueDto,
    userId: string,
  ) {
    const queue = await this.findByName(orgSlug, projectSlug, name, userId);

    if (queue.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot update queues');
    }

    const updated = await this.prisma.queue.update({
      where: { id: queue.id },
      data: {
        description: dto.description,
        priority: dto.priority,
        concurrencyLimit: dto.concurrencyLimit,
        retryStrategy: dto.retryStrategy,
        maxRetries: dto.maxRetries,
        baseRetryDelayMs: dto.baseRetryDelayMs,
        jobTimeoutMs: dto.jobTimeoutMs,
      },
    });

    this.eventsGateway.emitQueueUpdated({
      queueId: queue.id,
      status: queue.status,
    });
    return updated;
  }

  async pause(
    orgSlug: string,
    projectSlug: string,
    name: string,
    userId: string,
  ) {
    const queue = await this.findByName(orgSlug, projectSlug, name, userId);

    if (queue.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot control queues');
    }

    const updated = await this.prisma.queue.update({
      where: { id: queue.id },
      data: { status: QueueStatus.PAUSED },
    });

    this.eventsGateway.emitQueueUpdated({
      queueId: queue.id,
      status: QueueStatus.PAUSED,
    });
    return updated;
  }

  async resume(
    orgSlug: string,
    projectSlug: string,
    name: string,
    userId: string,
  ) {
    const queue = await this.findByName(orgSlug, projectSlug, name, userId);

    if (queue.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot control queues');
    }

    const updated = await this.prisma.queue.update({
      where: { id: queue.id },
      data: { status: QueueStatus.ACTIVE },
    });

    this.eventsGateway.emitQueueUpdated({
      queueId: queue.id,
      status: QueueStatus.ACTIVE,
    });
    return updated;
  }

  async delete(
    orgSlug: string,
    projectSlug: string,
    name: string,
    userId: string,
  ) {
    const queue = await this.findByName(orgSlug, projectSlug, name, userId);

    if (
      queue.userRole !== MembershipRole.OWNER &&
      queue.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can delete queues');
    }

    await this.prisma.queue.delete({
      where: { id: queue.id },
    });
  }

  async getStats(
    orgSlug: string,
    projectSlug: string,
    name: string,
    userId: string,
  ) {
    const queue = await this.findByName(orgSlug, projectSlug, name, userId);

    const jobs = await this.prisma.job.groupBy({
      by: ['status'],
      where: { queueId: queue.id },
      _count: { _all: true },
    });

    const stats = {
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

    for (const group of jobs) {
      if (group.status in stats) {
        stats[group.status] = group._count._all;
      }
    }

    return {
      queueId: queue.id,
      name: queue.name,
      status: queue.status,
      stats,
    };
  }
}
