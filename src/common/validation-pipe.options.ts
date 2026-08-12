import { BadRequestException, type ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * `whitelist` + `forbidNonWhitelisted` — то, что превращает DTO в белый список:
 * без них незнакомое поле в теле молча доедет до слоя данных.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  forbidUnknownValues: true,
  exceptionFactory: (errors: ValidationError[]) =>
    new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      details: errors.map((error) => ({
        field: error.property,
        constraints: Object.values(error.constraints ?? {}),
      })),
    }),
};
