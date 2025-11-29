import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

export const CurrentUser = createParamDecorator(
  (data: keyof DecodedIdToken | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // 'user' is set by FirebaseAuthGuard

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
