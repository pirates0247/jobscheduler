import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { MembershipRole } from '@prisma/client';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgsService: OrganizationsService,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  async create(orgSlug: string, dto: CreateProjectDto, userId: string) {
    const org = await this.orgsService.findBySlug(orgSlug, userId);

    if (org.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot create projects');
    }

    let slug = this.slugify(dto.name);
    const existing = await this.prisma.project.findFirst({
      where: { organizationId: org.id, slug },
    });

    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        organizationId: org.id,
      },
    });
  }

  async findAll(orgSlug: string, query: PaginationDto, userId: string) {
    const org = await this.orgsService.findBySlug(orgSlug, userId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId: org.id,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return paginate(projects, total, page, limit);
  }

  async findBySlug(orgSlug: string, projectSlug: string, userId: string) {
    const org = await this.orgsService.findBySlug(orgSlug, userId);

    const project = await this.prisma.project.findFirst({
      where: {
        organizationId: org.id,
        slug: projectSlug,
      },
      include: {
        queues: true,
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    return { ...project, userRole: org.userRole };
  }

  async update(
    orgSlug: string,
    projectSlug: string,
    dto: UpdateProjectDto,
    userId: string,
  ) {
    const project = await this.findBySlug(orgSlug, projectSlug, userId);

    if (project.userRole === MembershipRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot update projects');
    }

    return this.prisma.project.update({
      where: { id: project.id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async delete(orgSlug: string, projectSlug: string, userId: string) {
    const project = await this.findBySlug(orgSlug, projectSlug, userId);

    if (
      project.userRole !== MembershipRole.OWNER &&
      project.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only owners and admins can delete projects',
      );
    }

    await this.prisma.project.delete({
      where: { id: project.id },
    });
  }
}
