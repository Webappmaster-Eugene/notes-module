import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { NOTE_UPDATABLE_FIELDS } from '@/notes/notes.constants';
import { pickUpdatableFields, toNoteResponse } from '@/notes/notes.mapper';
import { NotesRepository } from '@/notes/notes.repository';
import type { NoteResponse, UpdateNoteCommand } from '@/notes/notes.types';

@Injectable()
export class NotesService {
  constructor(private readonly notesRepository: NotesRepository) {}

  async update(command: UpdateNoteCommand): Promise<NoteResponse> {
    const payload = pickUpdatableFields(command.patch);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_PATCH',
        message: `Provide at least one of: ${NOTE_UPDATABLE_FIELDS.join(', ')}`,
      });
    }

    const updated = await this.notesRepository.updateOwned(command.userId, command.noteId, payload);

    // Чужая и несуществующая заметка отвечают одинаково: 403 подтвердил бы,
    // что заметка с таким id существует, и перебор id стал бы разведкой.
    if (updated === null) {
      throw new NotFoundException({ code: 'NOTE_NOT_FOUND', message: 'Note not found' });
    }

    return toNoteResponse(updated);
  }
}
