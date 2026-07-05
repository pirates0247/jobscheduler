import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/organization.dto';
import { MembershipRole } from '@prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-'); // Replace multiple - with single -
  }

  async create(dto: CreateOrganizationDto, ownerId: string) {
    let slug = this.slugify(dto.name);
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        memberships: {
          create: {
            userId: ownerId,
            role: MembershipRole.OWNER,
          },
        },
      },
      include: {
        memberships: true,
      },
    });
  }

  async findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      include: {
        memberships: {
          where: { userId },
          select: { role: true },
        },
      },
    });
  }

  async findBySlug(slug: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        projects: true,
      },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const membership = org.memberships.find((m) => m.userId === userId);
    if (!membership) throw new ForbiddenException('Access denied');

    return { ...org, userRole: membership.role };
  }

  async update(slug: string, dto: UpdateOrganizationDto, userId: string) {
    const org = await this.findBySlug(slug, userId);
    if (
      org.userRole !== MembershipRole.OWNER &&
      org.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only owners and admins can update the organization',
      );
    }

    return this.prisma.organization.update({
      where: { id: org.id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async delete(slug: string, userId: string) {
    const org = await this.findBySlug(slug, userId);
    if (org.userRole !== MembershipRole.OWNER) {
      throw new ForbiddenException(
        'Only the owner can delete the organization',
      );
    }

    await this.prisma.organization.delete({
      where: { id: org.id },
    });
  }

  async inviteMember(slug: string, dto: InviteMemberDto, requesterId: string) {
    const org = await this.findBySlug(slug, requesterId);
    if (
      org.userRole !== MembershipRole.OWNER &&
      org.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!invitedUser) {
      throw new NotFoundException(
        'User with invited email not found. They must register first.',
      );
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: invitedUser.id,
          organizationId: org.id,
        },
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    return this.prisma.membership.create({
      data: {
        userId: invitedUser.id,
        organizationId: org.id,
        role: dto.role,
        invitedByEmail: dto.email,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getMembers(slug: string, userId: string) {
    const org = await this.findBySlug(slug, userId);
    return this.prisma.membership.findMany({
      where: { organizationId: org.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    slug: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    requesterId: string,
  ) {
    const org = await this.findBySlug(slug, requesterId);
    if (
      org.userRole !== MembershipRole.OWNER &&
      org.userRole !== MembershipRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only owners and admins can modify member roles',
      );
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.organizationId !== org.id) {
      throw new NotFoundException('Membership not found in this organization');
    }

    if (
      targetMembership.role === MembershipRole.OWNER &&
      requesterId !== targetMembership.userId
    ) {
      throw new ForbiddenException('Cannot modify owner membership role');
    }

    return this.prisma.membership.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  async removeMember(slug: string, memberId: string, requesterId: string) {
    const org = await this.findBySlug(slug, requesterId);

    const targetMembership = await this.prisma.membership.findUnique({
      where: { id: memberId },
    });

    if (!targetMembership || targetMembership.organizationId !== org.id) {
      throw new NotFoundException('Membership not found');
    }

    if (targetMembership.role === MembershipRole.OWNER) {
      throw new ForbiddenException(
        'Cannot remove the owner of the organization',
      );
    }

    if (
      org.userRole !== MembershipRole.OWNER &&
      org.userRole !== MembershipRole.ADMIN &&
      targetMembership.userId !== requesterId
    ) {
      throw new ForbiddenException(
        'You do not have permission to remove this member',
      );
    }

    await this.prisma.membership.delete({
      where: { id: memberId },
    });
  }
}
