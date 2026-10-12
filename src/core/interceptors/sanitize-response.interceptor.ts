import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  SensitiveDataUtil,
  SanitizationMode,
} from '@core/utils/sensitive-data.util';

import {
  ALLOW_AUTH_TOKENS_KEY,
} from '@core/decorators/allow-auth-tokens.decorator';

@Injectable()
export class SanitizeResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const allowAuthTokens =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_AUTH_TOKENS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      ) ?? false;

    return next.handle().pipe(
      map((data) =>
        SensitiveDataUtil.sanitize(
          data,
          SanitizationMode.RESPONSE,
          allowAuthTokens,
        ),
      ),
    );
  }
}