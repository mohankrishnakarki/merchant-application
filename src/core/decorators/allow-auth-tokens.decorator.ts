import { SetMetadata } from '@nestjs/common';

export const ALLOW_AUTH_TOKENS_KEY = 'allowAuthTokens';

export const AllowAuthTokens = () =>
  SetMetadata(ALLOW_AUTH_TOKENS_KEY, true);