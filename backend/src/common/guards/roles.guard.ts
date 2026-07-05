import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const roleHierarchy: Record<MembershipRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  DEVELOPER: 2,
  VIEWER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // If user has orgRole set (from context), check it
    const userRole: MembershipRole = user.orgRole;
    if (!userRole) return true; // No org context, pass through

    const userLevel = roleHierarchy[userRole] ?? 0;
    return requiredRoles.some((r) => userLevel >= roleHierarchy[r]);
  }
}
