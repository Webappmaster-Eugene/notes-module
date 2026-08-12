import type { Note } from '@prisma/client';

export type NoteRecord = Note;

/**
 * Белый список изменяемых полей. Задан явным типом, а не `Prisma.NoteUpdateInput`,
 * чтобы новое поле в модели не становилось редактируемым автоматически.
 */
export type NoteUpdatePayload = {
  title?: string;
  content?: string | null;
};

export type UpdateNoteCommand = {
  userId: string;
  noteId: string;
  patch: NoteUpdatePayload;
};

export type NoteResponse = {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};
