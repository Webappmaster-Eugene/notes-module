import type { NoteRecord, NoteResponse, NoteUpdatePayload } from '@/notes/notes.types';

/**
 * Пересобирает патч поле за полем. Типы стираются в рантайме, поэтому объект,
 * пришедший из транспорта, может нести лишние ключи — сюда они не попадут.
 */
export function pickUpdatableFields(patch: NoteUpdatePayload): NoteUpdatePayload {
  const payload: NoteUpdatePayload = {};

  if (patch.title !== undefined) {
    payload.title = patch.title;
  }

  if (patch.content !== undefined) {
    payload.content = patch.content;
  }

  return payload;
}

export function toNoteResponse(note: NoteRecord): NoteResponse {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}
