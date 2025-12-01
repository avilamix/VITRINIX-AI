
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const idToken = this.extractTokenFromHeader(request);

    if (!idToken) {
      throw new UnauthorizedException('No Firebase ID token found in headers');
    }

    try {
      const decodedToken: DecodedIdToken = await this.authService.validateFirebaseToken(idToken);
      // Attach the decoded Firebase user to the request
      (request as any)['user'] = decodedToken;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Firebase ID token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Cast to any to avoid strict type checks on headers if Request type definition is conflicting
    const headers = (request as any).headers;
    const [type, token] = headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
