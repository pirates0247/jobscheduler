import { PrismaClient, MembershipRole, QueueStatus, RetryStrategy } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create user
  const email = 'admin@codity.ai';
  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    },
  });

  // Create organization
  const org = await prisma.organization.upsert({
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

  // Create project
  const project = await prisma.project.upsert({
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

  // Create default queues
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
    await prisma.queue.upsert({
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

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
