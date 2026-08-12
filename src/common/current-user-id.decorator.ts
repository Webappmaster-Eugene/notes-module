import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';

type AuthenticatedRequest = { user?: { id?: unknown } };

// Единственный источник userId — объект, положенный в запрос гардом аутентификации.
// Всё, что приходит из body/query/params, владельцем считаться не может.
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (typeof userId !== 'string' || userId.length === 0) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      });
    }

    return userId;
  },
);
