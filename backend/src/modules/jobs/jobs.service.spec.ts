import { Test, TestingModule } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';
import { EventsGateway } from '../events/events.gateway';
import { JobType, MembershipRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('JobsService', () => {
  let service: JobsService;
  let prisma: PrismaService;
  let queues: QueuesService;

  const mockPrisma = {
    job: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    executionLog: {
      create: jest.fn(),
    },
  };

  const mockQueues = {
    findByName: jest.fn(),
  };

  const mockEvents = {
    emitJobCreated: jest.fn(),
    emitJobUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueuesService, useValue: mockQueues },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    prisma = module.get<PrismaService>(PrismaService);
    queues = module.get<QueuesService>(QueuesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ForbiddenException if user has Viewer role', async () => {
      mockQueues.findByName.mockResolvedValue({
        id: 'q_1',
        userRole: MembershipRole.VIEWER,
      });

      await expect(
        service.create(
          'org',
          'proj',
          'queue',
          {
            type: JobType.IMMEDIATE,
          },
          'user_1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create job successfully', async () => {
      mockQueues.findByName.mockResolvedValue({
        id: 'q_1',
        name: 'test-queue',
        priority: 10,
        maxRetries: 3,
        userRole: MembershipRole.OWNER,
      });

      mockPrisma.job.create.mockResolvedValue({
        id: 'job_1',
        queueId: 'q_1',
        type: JobType.IMMEDIATE,
      });

      const res = await service.create(
        'org',
        'proj',
        'queue',
        {
          type: JobType.IMMEDIATE,
        },
        'user_1',
      );

      expect(res.id).toBe('job_1');
    });
  });
});
