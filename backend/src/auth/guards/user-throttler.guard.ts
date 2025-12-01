
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from '../auth.service'; // Import AuthService
import { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(private authService: AuthService) { // Inject AuthService
    super();
  }

  // Override getTracker to use Firebase UID instead of IP
  protected getTracker(req: Request): string {
    const firebaseUser: DecodedIdToken = (req as any)['user']; // Assuming FirebaseAuthGuard has run and attached user

    if (firebaseUser?.uid) {
      return firebaseUser.uid; // Use Firebase UID as the tracker
    }
    // Fallback to IP if Firebase UID is not available (e.g., public endpoints not using auth guard)
    return (req as any).ip; 
  }

  // Override canActivate to ensure FirebaseAuthGuard has run if applicable
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    // Check if the request is protected by FirebaseAuthGuard. If so, ensure user is set.
    // This is a heuristic. A more robust solution involves metadata or specific decorators.
    const headers = (request as any).headers;
    const isProtectedByFirebaseAuth = headers.authorization?.startsWith('Bearer');
    
    if (isProtectedByFirebaseAuth) {
      // If the route is expected to be authenticated, ensure req.user is populated.
      // This implicitly waits for FirebaseAuthGuard to run if it's chained before this guard.
      try {
        if (!(request as any)['user']) {
            // Re-validate token if not already done, or simply fail if token is missing/invalid
            const idToken = headers.authorization.split(' ')[1];
            (request as any)['user'] = await this.authService.validateFirebaseToken(idToken);
        }
      } catch (e) {
        // If Firebase auth fails here, let FirebaseAuthGuard (if present) handle the 401.
        // If not present, this will cause a 401 which is appropriate.
        return false; 
      }
    }
    
    return super.canActivate(context);
  }
}
