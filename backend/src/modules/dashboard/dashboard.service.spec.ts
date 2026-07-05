import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { JobStatus } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockPrisma = {
    project: {
      findMany: jest.fn(),
    },
    queue: {
      findMany: jest.fn(),
    },
    job: {
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    worker: {
      count: jest.fn(),
    },
  };

  const mockOrgs = {
    findBySlug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OrganizationsService, useValue: mockOrgs },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return aggregated metrics', async () => {
      mockOrgs.findBySlug.mockResolvedValue({
        id: 'org_1',
        userRole: 'OWNER',
      });
      mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj_1' }]);
      mockPrisma.queue.findMany.mockResolvedValue([{ id: 'q_1' }]);
      const now = new Date();
      mockPrisma.job.groupBy
        .mockResolvedValueOnce([
          { status: JobStatus.QUEUED, _count: { _all: 10 } },
          { status: JobStatus.RUNNING, _count: { _all: 5 } },
          { status: JobStatus.COMPLETED, _count: { _all: 100 } },
        ])
        .mockResolvedValueOnce([
          { status: JobStatus.COMPLETED, createdAt: now, _count: { _all: 15 } },
          { status: JobStatus.FAILED, createdAt: now, _count: { _all: 3 } },
        ]);
      mockPrisma.worker.count.mockResolvedValue(3);
      mockPrisma.job.aggregate.mockResolvedValue({
        _avg: { processingTimeMs: 1500 },
      });
      const findManyNow = new Date();
      mockPrisma.job.findMany.mockResolvedValue([
        {
          startedAt: new Date(findManyNow.getTime() - 2000),
          completedAt: findManyNow,
        },
      ]);

      const res = await service.getMetrics('org_1', 'user_1');
      expect(res.stats).toBeDefined();
      expect(res.activeWorkers).toBe(3);
      expect(res.avgProcessingTimeMs).toBeGreaterThan(0);
      expect(res.charts).toBeDefined();
    });
  });
});
