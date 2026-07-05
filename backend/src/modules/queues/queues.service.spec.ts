import { Test, TestingModule } from '@nestjs/testing';
import { QueuesService } from './queues.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { EventsGateway } from '../events/events.gateway';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { QueueStatus, MembershipRole } from '@prisma/client';

describe('QueuesService', () => {
  let service: QueuesService;
  let prisma: PrismaService;

  const mockPrisma = {
    queue: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    job: {
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockProjects = {
    findBySlug: jest.fn(),
  };

  const mockEvents = {
    emitQueueUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ProjectsService, useValue: mockProjects },
        { provide: EventsGateway, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<QueuesService>(QueuesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a queue successfully', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.OWNER,
      });
      mockPrisma.queue.findFirst.mockResolvedValue(null);
      mockPrisma.queue.create.mockResolvedValue({
        id: 'q_1',
        name: 'test-queue',
        status: QueueStatus.ACTIVE,
      });

      const res = await service.create(
        'org',
        'proj',
        { name: 'test-queue' },
        'user_1',
      );
      expect(res.name).toBe('test-queue');
    });

    it('should throw ConflictException if name exists', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.OWNER,
      });
      mockPrisma.queue.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('org', 'proj', { name: 'test-queue' }, 'user_1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException for viewers', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.VIEWER,
      });

      await expect(
        service.create('org', 'proj', { name: 'test-queue' }, 'user_1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByName', () => {
    it('should throw NotFoundException if queue not found', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.OWNER,
      });
      mockPrisma.queue.findFirst.mockResolvedValue(null);

      await expect(
        service.findByName('org', 'proj', 'nonexistent', 'user_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('pause', () => {
    it('should pause a queue', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.OWNER,
      });
      mockPrisma.queue.findFirst.mockResolvedValue({
        id: 'q_1',
        name: 'test-queue',
        projectId: 'proj_1',
        status: QueueStatus.ACTIVE,
      });
      mockPrisma.queue.update.mockResolvedValue({
        id: 'q_1',
        status: QueueStatus.PAUSED,
      });

      const res = await service.pause('org', 'proj', 'test-queue', 'user_1');
      expect(res.status).toBe(QueueStatus.PAUSED);
    });
  });

  describe('resume', () => {
    it('should resume a queue', async () => {
      mockProjects.findBySlug.mockResolvedValue({
        id: 'proj_1',
        userRole: MembershipRole.OWNER,
      });
      mockPrisma.queue.findFirst.mockResolvedValue({
        id: 'q_1',
        name: 'test-queue',
        projectId: 'proj_1',
        status: QueueStatus.PAUSED,
      });
      mockPrisma.queue.update.mockResolvedValue({
        id: 'q_1',
        status: QueueStatus.ACTIVE,
      });

      const res = await service.resume('org', 'proj', 'test-queue', 'user_1');
      expect(res.status).toBe(QueueStatus.ACTIVE);
    });
  });
});
