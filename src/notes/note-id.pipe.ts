import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';

/**
 * Отсекает мусор в пути до похода в базу: без него Postgres упал бы на приведении
 * к uuid и клиент получил бы 500 вместо 400.
 */
export const NOTE_ID_PARAM_PIPE = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException({ code: 'INVALID_NOTE_ID', message: 'noteId must be a UUID' }),
});
