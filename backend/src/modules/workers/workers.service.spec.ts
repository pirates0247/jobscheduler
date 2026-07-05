import { Test, TestingModule } from '@nestjs/testing';
import { WorkersService } from './workers.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkerStatus, JobStatus, LogLevel, JobType } from '@prisma/client';

describe('WorkersService', () => {
  let service: WorkersService;
  let prisma: PrismaService;

  const mockPrisma = {
    worker: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    },
    workerHeartbeat: {
      create: jest.fn(),
    },
    job: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    executionLog: {
      create: jest.fn(),
    },
    retryHistory: {
      create: jest.fn(),
    },
    deadLetterJob: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };

  const mockEvents = {
    emitWorkerHeartbeat: jest.fn(),
    emitJobUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<WorkersService>(WorkersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new worker', async () => {
      mockPrisma.worker.create.mockResolvedValue({
        id: 'w_1',
        name: 'test-worker',
        status: WorkerStatus.ONLINE,
      });

      const res = await service.register({
        name: 'test-worker',
        concurrency: 5,
        queues: ['q1'],
      });

      expect(res.id).toBe('w_1');
      expect(res.status).toBe(WorkerStatus.ONLINE);
      expect(mockPrisma.workerHeartbeat.create).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should throw NotFoundException if worker does not exist', async () => {
      mockPrisma.worker.findUnique.mockResolvedValue(null);
      await expect(
        service.heartbeat('nonexistent', { activeJobs: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update worker heartbeat', async () => {
      mockPrisma.worker.findUnique.mockResolvedValue({
        id: 'w_1',
        name: 'test-worker',
      });
      mockPrisma.worker.update.mockResolvedValue({
        id: 'w_1',
        status: WorkerStatus.ONLINE,
      });

      const res = await service.heartbeat('w_1', {
        activeJobs: 2,
        memoryMb: 512,
        cpuPct: 45,
      });
      expect(res.status).toBe(WorkerStatus.ONLINE);
    });
  });

  describe('claimJobs', () => {
    it('should return empty array if no queueIds provided', async () => {
      mockPrisma.worker.findUnique.mockResolvedValue({
        id: 'w_1',
        concurrency: 5,
      });
      const res = await service.claimJobs('w_1', { queueIds: [], limit: 5 });
      expect(res).toEqual([]);
    });

    it('should throw NotFoundException if worker not found', async () => {
      mockPrisma.worker.findUnique.mockResolvedValue(null);
      await expect(
        service.claimJobs('nonexistent', { queueIds: ['q1'], limit: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('completeJob', () => {
    it('should complete a job successfully', async () => {
      const mockJob = {
        id: 'j_1',
        claimedBy: 'w_1',
        type: JobType.IMMEDIATE,
        queueId: 'q_1',
        queue: {
          project: { organization: { slug: 'test-org' } },
        },
        payload: {},
        priority: 0,
        maxRetries: 3,
        tags: [],
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.job.update.mockResolvedValue({
        id: 'j_1',
        status: JobStatus.COMPLETED,
      });

      const res = await service.completeJob('w_1', 'j_1', {
        result: { output: 'done' },
      });
      expect(res.status).toBe(JobStatus.COMPLETED);
    });

    it('should throw BadRequestException if claimed by another worker', async () => {
      mockPrisma.job.findUnique.mockResolvedValue({
        id: 'j_1',
        claimedBy: 'w_2',
      });

      await expect(service.completeJob('w_1', 'j_1', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('failJob', () => {
    it('should retry with fixed delay', async () => {
      const mockJob = {
        id: 'j_1',
        claimedBy: 'w_1',
        attempts: 0,
        maxRetries: 3,
        queueId: 'q_1',
        queue: {
          baseRetryDelayMs: 1000,
          retryStrategy: 'FIXED',
          project: { organization: { slug: 'test-org' } },
        },
        payload: {},
        priority: 0,
        tags: [],
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          job: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'j_1', status: JobStatus.RETRYING }),
          },
          retryHistory: { create: jest.fn() },
          executionLog: { create: jest.fn() },
        };
        return cb(tx);
      });

      const res = await service.failJob('w_1', 'j_1', {
        errorMessage: 'Something failed',
      });
      expect(res.status).toBe(JobStatus.RETRYING);
    });

    it('should move to dead letter after max retries exhausted', async () => {
      const mockJob = {
        id: 'j_1',
        claimedBy: 'w_1',
        attempts: 3,
        maxRetries: 3,
        queueId: 'q_1',
        queue: {
          baseRetryDelayMs: 1000,
          retryStrategy: 'FIXED',
          project: { organization: { slug: 'test-org' } },
        },
        payload: { test: true },
        priority: 0,
        tags: [],
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);
      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        const tx = {
          job: {
            update: jest
              .fn()
              .mockResolvedValue({ id: 'j_1', status: JobStatus.DEAD_LETTER }),
          },
          deadLetterJob: { create: jest.fn() },
          executionLog: { create: jest.fn() },
        };
        return cb(tx);
      });

      const res = await service.failJob('w_1', 'j_1', {
        errorMessage: 'Final failure',
      });
      expect(res.status).toBe(JobStatus.DEAD_LETTER);
    });
  });

  describe('pruneOfflineWorkers', () => {
    it('should mark stale workers as offline', async () => {
      mockPrisma.worker.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.pruneOfflineWorkers();
      expect(res.count).toBe(2);
    });
  });
});
