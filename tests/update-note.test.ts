import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { NotesRepository } from '@/notes/notes.repository';
import { NotesService } from '@/notes/notes.service';
import type { NoteUpdatePayload } from '@/notes/notes.types';

import { expectRejection } from './helpers/expect-rejection';
import {
  createFakePrisma,
  FOREIGN_NOTE_ID,
  MISSING_NOTE_ID,
  OWNER_ID,
  OWN_NOTE_ID,
  SEEDED_AT,
  STRANGER_ID,
  UPDATED_AT,
  makeNote,
  uniqueConstraintError,
} from './helpers/fake-prisma';

function buildService(options: { failWith?: unknown } = {}) {
  const prisma = createFakePrisma(
    [
      makeNote(),
      makeNote({
        id: FOREIGN_NOTE_ID,
        userId: STRANGER_ID,
        title: 'Чужой заголовок',
        content: 'Чужое содержимое',
      }),
    ],
    options,
  );

  return { prisma, service: new NotesService(new NotesRepository(prisma.client)) };
}

describe('NotesService.update', () => {
  it('меняет только переданные поля своей заметки', async () => {
    const { service } = buildService();

    const result = await service.update({
      userId: OWNER_ID,
      noteId: OWN_NOTE_ID,
      patch: { title: 'Новый заголовок' },
    });

    expect(result).toEqual({
      id: OWN_NOTE_ID,
      title: 'Новый заголовок',
      content: 'Исходное содержимое',
      createdAt: SEEDED_AT.toISOString(),
      updatedAt: UPDATED_AT.toISOString(),
    });
  });

  it('очищает содержимое при явном null и не трогает его при отсутствии ключа', async () => {
    const { service } = buildService();

    const cleared = await service.update({
      userId: OWNER_ID,
      noteId: OWN_NOTE_ID,
      patch: { content: null },
    });
    expect(cleared.content).toBeNull();
    expect(cleared.title).toBe('Исходный заголовок');

    const untouched = await service.update({
      userId: OWNER_ID,
      noteId: OWN_NOTE_ID,
      patch: { title: 'Ещё один заголовок' },
    });
    expect(untouched.content).toBeNull();
  });

  it('передаёт владение в предикат запроса, а не проверяет его отдельной веткой', async () => {
    const { prisma, service } = buildService();

    await service.update({
      userId: OWNER_ID,
      noteId: OWN_NOTE_ID,
      patch: { title: 'Новый заголовок' },
    });

    expect(prisma.updateCalls).toHaveLength(1);
    expect(prisma.updateCalls[0]?.where).toEqual({ id: OWN_NOTE_ID, userId: OWNER_ID });
  });

  it('в data уходят только разрешённые поля, даже если патч принёс лишние', async () => {
    const { prisma, service } = buildService();

    const hostilePatch = {
      title: 'Новый заголовок',
      userId: STRANGER_ID,
      id: FOREIGN_NOTE_ID,
      createdAt: new Date('2000-01-01T00:00:00.000Z'),
    } as unknown as NoteUpdatePayload;

    await service.update({ userId: OWNER_ID, noteId: OWN_NOTE_ID, patch: hostilePatch });

    expect(prisma.updateCalls[0]?.data).toEqual({ title: 'Новый заголовок' });
  });

  describe('чужая заметка', () => {
    it('отвечает 404 и не меняет данные владельца', async () => {
      const { prisma, service } = buildService();

      await expect(
        service.update({
          userId: OWNER_ID,
          noteId: FOREIGN_NOTE_ID,
          patch: { title: 'Захвачено' },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      const foreign = prisma.rows.find((row) => row.id === FOREIGN_NOTE_ID);
      expect(foreign).toMatchObject({
        title: 'Чужой заголовок',
        content: 'Чужое содержимое',
        userId: STRANGER_ID,
        updatedAt: SEEDED_AT,
      });
    });

    it('неотличима по ответу от несуществующей заметки', async () => {
      const { service } = buildService();

      const foreign = await expectRejection(
        service.update({
          userId: OWNER_ID,
          noteId: FOREIGN_NOTE_ID,
          patch: { title: 'Захвачено' },
        }),
        NotFoundException,
      );
      const missing = await expectRejection(
        service.update({
          userId: OWNER_ID,
          noteId: MISSING_NOTE_ID,
          patch: { title: 'Захвачено' },
        }),
        NotFoundException,
      );

      expect(foreign.getStatus()).toBe(404);
      expect(missing.getStatus()).toBe(404);
      expect(foreign.getResponse()).toEqual(missing.getResponse());
      expect(foreign.getResponse()).toEqual({ code: 'NOTE_NOT_FOUND', message: 'Note not found' });
    });
  });

  it('отклоняет пустой патч, не обращаясь к базе', async () => {
    const { prisma, service } = buildService();

    const error = await expectRejection(
      service.update({ userId: OWNER_ID, noteId: OWN_NOTE_ID, patch: {} }),
      BadRequestException,
    );

    expect(error.getResponse()).toMatchObject({ code: 'EMPTY_PATCH' });
    expect(prisma.updateCalls).toHaveLength(0);
  });

  it('не выдаёт прочие ошибки базы за 404', async () => {
    const failure = uniqueConstraintError();
    const { service } = buildService({ failWith: failure });

    await expect(
      service.update({
        userId: OWNER_ID,
        noteId: OWN_NOTE_ID,
        patch: { title: 'Новый заголовок' },
      }),
    ).rejects.toBe(failure);
  });
});
