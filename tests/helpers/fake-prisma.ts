import { Prisma } from '@prisma/client';

import type { NoteRecord } from '@/notes/notes.types';
import type { PrismaService } from '@/prisma/prisma.service';

export const OWNER_ID = '019706f0-0000-7000-8000-00000000a001';
export const STRANGER_ID = '019706f0-0000-7000-8000-00000000a002';
export const OWN_NOTE_ID = '019706f0-0000-7000-8000-00000000b001';
export const FOREIGN_NOTE_ID = '019706f0-0000-7000-8000-00000000b002';
export const MISSING_NOTE_ID = '019706f0-0000-7000-8000-00000000b0ff';

export const SEEDED_AT = new Date('2026-06-01T10:00:00.000Z');
export const UPDATED_AT = new Date('2026-06-04T12:00:00.000Z');

export type NoteUpdateArgs = {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
};

export type FakePrisma = {
  client: PrismaService;
  rows: NoteRecord[];
  updateCalls: NoteUpdateArgs[];
};

export function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: OWN_NOTE_ID,
    title: 'Исходный заголовок',
    content: 'Исходное содержимое',
    userId: OWNER_ID,
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
    ...overrides,
  };
}

export function uniqueConstraintError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: Prisma.prismaVersion.client,
  });
}

/**
 * Повторяет поведение `prisma.note.update` с расширенным where: строка ищется по всем
 * переданным ключам предиката, при промахе выбрасывается P2025. Это стенд, а не БД —
 * реальный SQL-предикат и индексы проверяются интеграционным тестом против Postgres.
 */
export function createFakePrisma(
  seed: readonly NoteRecord[],
  options: { failWith?: unknown; now?: Date } = {},
): FakePrisma {
  const rows = seed.map((note) => ({ ...note }));
  const updateCalls: NoteUpdateArgs[] = [];
  const now = options.now ?? UPDATED_AT;

  const client = {
    note: {
      update: async (args: NoteUpdateArgs): Promise<NoteRecord> => {
        updateCalls.push(structuredClone(args));

        if (options.failWith !== undefined) {
          throw options.failWith;
        }

        const row = rows.find((candidate) => matchesWhere(candidate, args.where));

        if (row === undefined) {
          throw recordNotFoundError();
        }

        Object.assign(row, args.data, { updatedAt: now });

        return { ...row };
      },
    },
  };

  // PrismaService несёт сотни членов; репозиторий использует ровно один — приведение
  // ограничено этим хелпером, продакшн-код типизирован настоящим клиентом.
  return { client: client as unknown as PrismaService, rows, updateCalls };
}

function recordNotFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'An operation failed because it depends on one or more records that were required but not found',
    { code: 'P2025', clientVersion: Prisma.prismaVersion.client },
  );
}

function matchesWhere(row: NoteRecord, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(
    ([field, expected]) => (row as unknown as Record<string, unknown>)[field] === expected,
  );
}
