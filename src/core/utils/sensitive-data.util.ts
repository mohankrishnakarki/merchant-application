export enum SanitizationMode {
  RESPONSE = 'RESPONSE',
  AUDIT = 'AUDIT',
}

export class SensitiveDataUtil {
  private static readonly sensitiveKeys = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'apikey',
    'taxid',
    'ssn',
    'email',
    'phone',
    'mobile',
    'businessname',
    'legalbusinessname',
  ];

  private static readonly secretKeys = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'apikey',
    'privatekey',
  ];

  private static readonly authResponseKeys = [
    'accesstoken',
    'refreshtoken',
  ];

  static sanitize<T>(
    data: T,
    mode: SanitizationMode = SanitizationMode.RESPONSE,
    allowAuthTokens = false,
  ): T {
    return this.redact(data, mode, allowAuthTokens) as T;
  }

  private static redact(
    value: unknown,
    mode: SanitizationMode,
    allowAuthTokens: boolean,
  ): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.redact(item, mode, allowAuthTokens),
      );
    }

    if (typeof value !== 'object') {
      return value;
    }

    const result: Record<string, unknown> = {};

    for (const [key, fieldValue] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();

      // Allow auth tokens only for explicitly authorized API responses.
      if (
        mode === SanitizationMode.RESPONSE &&
        allowAuthTokens &&
        this.authResponseKeys.includes(normalizedKey)
      ) {
        result[key] = fieldValue;
        continue;
      }

      // Never include credentials in audit records.
      if (
        this.secretKeys.some((secret) =>
          normalizedKey.includes(secret),
        )
      ) {
        if (mode === SanitizationMode.AUDIT) {
          continue;
        }

        result[key] = '********';
        continue;
      }

      // Mask configured sensitive fields.
      if (
        this.sensitiveKeys.some((sensitive) =>
          normalizedKey.includes(sensitive),
        )
      ) {
        result[key] =
          fieldValue === null || fieldValue === undefined
            ? fieldValue
            : '********';

        continue;
      }

      result[key] = this.redact(
        fieldValue,
        mode,
        allowAuthTokens,
      );
    }

    return result;
  }
}