import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { NoteRecord, NoteUpdatePayload } from '@/notes/notes.types';
import { PrismaService } from '@/prisma/prisma.service';

const PRISMA_RECORD_NOT_FOUND = 'P2025';

@Injectable()
export class NotesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Владение — часть предиката запроса, а не отдельная ветка в коде: строка,
   * не принадлежащая userId, просто не находится. Возвращает null, если такой
   * заметки у пользователя нет; отличать «не существует» от «чужая» здесь нечем и не нужно.
   */
  async updateOwned(
    userId: string,
    noteId: string,
    payload: NoteUpdatePayload,
  ): Promise<NoteRecord | null> {
    try {
      return await this.prisma.note.update({
        where: { id: noteId, userId },
        data: payload,
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }

      throw error;
    }
  }
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_RECORD_NOT_FOUND
  );
}
