import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Decorador para obtener el usuario logueado en cualquier endpoint
// Uso: @CurrentUser() user: User
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
