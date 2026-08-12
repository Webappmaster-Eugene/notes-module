import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { VALIDATION_PIPE_OPTIONS } from '@/common/validation-pipe.options';
import { UpdateNoteDto } from '@/notes/dto/update-note.dto';
import { NOTE_TITLE_MAX_LENGTH } from '@/notes/notes.constants';
import { NOTE_ID_PARAM_PIPE } from '@/notes/note-id.pipe';

import { expectRejection } from './helpers/expect-rejection';
import { OWN_NOTE_ID } from './helpers/fake-prisma';

const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

async function validate(body: unknown): Promise<UpdateNoteDto> {
  return pipe.transform(body, { type: 'body', metatype: UpdateNoteDto }) as Promise<UpdateNoteDto>;
}

describe('UpdateNoteDto', () => {
  it('обрезает пробелы вокруг заголовка', async () => {
    await expect(validate({ title: '  Новый заголовок  ' })).resolves.toEqual({
      title: 'Новый заголовок',
    });
  });

  it('принимает явный null как очистку содержимого', async () => {
    await expect(validate({ content: null })).resolves.toEqual({ content: null });
  });

  it('пропускает пустое тело — правило «патч не должен быть пустым» проверяет сервис', async () => {
    await expect(validate({})).resolves.toEqual({});
  });

  it('отклоняет заголовок из одних пробелов', async () => {
    await expect(validate({ title: '   ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет null в заголовке: очищать обязательное поле нечем', async () => {
    await expect(validate({ title: null })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет заголовок длиннее лимита колонки', async () => {
    await expect(validate({ title: 'я'.repeat(NOTE_TITLE_MAX_LENGTH + 1) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('отклоняет попытку передать поле вне белого списка', async () => {
    await expect(validate({ title: 'Новый заголовок', userId: 'другой' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('отдаёт ошибку валидации в общем для модуля конверте', async () => {
    const error = await expectRejection(validate({ title: '' }), BadRequestException);

    expect(error.getResponse()).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      details: [{ field: 'title', constraints: expect.arrayContaining([expect.any(String)]) }],
    });
  });
});

describe('noteId в пути', () => {
  it('пропускает корректный UUID', async () => {
    await expect(
      NOTE_ID_PARAM_PIPE.transform(OWN_NOTE_ID, { type: 'param', data: 'noteId' }),
    ).resolves.toBe(OWN_NOTE_ID);
  });

  it('отклоняет мусор своим кодом ошибки, не доводя запрос до базы', async () => {
    const error = await expectRejection(
      NOTE_ID_PARAM_PIPE.transform('не-uuid', { type: 'param', data: 'noteId' }),
      BadRequestException,
    );

    expect(error.getResponse()).toEqual({
      code: 'INVALID_NOTE_ID',
      message: 'noteId must be a UUID',
    });
  });
});
