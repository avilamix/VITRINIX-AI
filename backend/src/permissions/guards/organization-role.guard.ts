
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PermissionsService } from '../permissions.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user; // Set by FirebaseAuthGuard
    const organizationId = request.params.organizationId;

    if (!user || !user.uid) {
      throw new UnauthorizedException('User not authenticated.');
    }
    if (!organizationId) {
      throw new ForbiddenException('Organization ID is missing in the request path.');
    }

    const userRole = await this.permissionsService.getUserRoleInOrganization(user.uid, organizationId);
    
    if (!userRole) {
      throw new ForbiddenException('You are not a member of this organization.');
    }

    const hasPermission = requiredRoles.some((role) => userRole === role);
    if (!hasPermission) {
      throw new ForbiddenException(`Your role (${userRole}) does not have permission for this action.`);
    }

    return true;
  }
}
