import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    membership: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create organization and membership', async () => {
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org_1',
        name: 'Test Org',
        slug: 'test-org',
      });
      mockPrisma.membership.create.mockResolvedValue({});

      const res = await service.create({ name: 'Test Org' }, 'user_1');
      expect(res.name).toBe('Test Org');
    });
  });

  describe('findBySlug', () => {
    it('should throw NotFoundException if org not found', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('nonexistent', 'user_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return organization with details', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        name: 'Test Org',
        memberships: [{ userId: 'user_1', role: MembershipRole.OWNER }],
        projects: [],
      });

      const res = await service.findBySlug('test-org', 'user_1');
      expect(res.name).toBe('Test Org');
    });
  });

  describe('findAllForUser', () => {
    it('should return organizations for user', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        { id: 'org_1', name: 'Test Org' },
      ]);

      const res = await service.findAllForUser('user_1');
      expect(res).toHaveLength(1);
    });
  });

  describe('inviteMember', () => {
    it('should invite a member successfully', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        memberships: [{ userId: 'user_1', role: MembershipRole.OWNER }],
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_2' });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.membership.create.mockResolvedValue({
        id: 'm_1',
        role: 'DEVELOPER',
      });

      const res = await service.inviteMember(
        'org_1',
        { email: 'test@example.com', role: MembershipRole.DEVELOPER },
        'user_1',
      );
      expect(res.role).toBe('DEVELOPER');
    });

    it('should throw ForbiddenException if not owner/admin', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        memberships: [{ userId: 'user_1', role: MembershipRole.VIEWER }],
      });

      await expect(
        service.inviteMember(
          'org_1',
          { email: 'test@example.com', role: MembershipRole.DEVELOPER },
          'user_1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
