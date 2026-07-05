import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipRole, RetryStrategy } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.seed();
  }

  async seed() {
    this.logger.log('Seeding database...');

    try {
      const email = 'admin@codity.ai';
      const passwordHash = await bcrypt.hash('password123', 12);

      const user = await this.prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
        },
      });

      this.logger.log(`User seeded: ${user.email}`);

      const org = await this.prisma.organization.upsert({
        where: { slug: 'demo-org' },
        update: {},
        create: {
          name: 'Demo Org',
          slug: 'demo-org',
          description: 'Default organization for job scheduling demo',
          memberships: {
            create: {
              userId: user.id,
              role: MembershipRole.OWNER,
            },
          },
        },
      });

      this.logger.log(`Organization seeded: ${org.slug}`);

      const project = await this.prisma.project.upsert({
        where: {
          organizationId_slug: {
            organizationId: org.id,
            slug: 'default-project',
          },
        },
        update: {},
        create: {
          name: 'Default Project',
          slug: 'default-project',
          description: 'Primary workspace project',
          organizationId: org.id,
        },
      });

      this.logger.log(`Project seeded: ${project.slug}`);

      const queues = [
        {
          name: 'default-queue',
          description: 'Standard processing queue',
          priority: 10,
          concurrencyLimit: 5,
          retryStrategy: RetryStrategy.EXPONENTIAL,
        },
        {
          name: 'high-priority-queue',
          description: 'Critical and time-sensitive tasks',
          priority: 50,
          concurrencyLimit: 10,
          retryStrategy: RetryStrategy.LINEAR,
        },
        {
          name: 'bulk-processing-queue',
          description: 'Long running report tasks',
          priority: 5,
          concurrencyLimit: 2,
          retryStrategy: RetryStrategy.FIXED,
        },
      ];

      for (const q of queues) {
        await this.prisma.queue.upsert({
          where: {
            projectId_name: {
              projectId: project.id,
              name: q.name,
            },
          },
          update: {},
          create: {
            projectId: project.id,
            name: q.name,
            description: q.description,
            priority: q.priority,
            concurrencyLimit: q.concurrencyLimit,
            retryStrategy: q.retryStrategy,
          },
        });
      }

      this.logger.log('Queues seeded');
      this.logger.log('Seeding finished successfully.');
    } catch (error) {
      this.logger.error('Seeding failed', error instanceof Error ? error.stack : error);
    }
  }
}
