import { Body, Controller, Param, Patch, UsePipes, ValidationPipe } from '@nestjs/common';

import { CurrentUserId } from '@/common/current-user-id.decorator';
import { VALIDATION_PIPE_OPTIONS } from '@/common/validation-pipe.options';
import { UpdateNoteDto } from '@/notes/dto/update-note.dto';
import { NOTE_ID_PARAM_PIPE } from '@/notes/note-id.pipe';
import { NotesService } from '@/notes/notes.service';
import type { NoteResponse } from '@/notes/notes.types';

@Controller('notes')
@UsePipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS))
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Patch(':noteId')
  async update(
    @CurrentUserId() userId: string,
    @Param('noteId', NOTE_ID_PARAM_PIPE) noteId: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteResponse> {
    return this.notesService.update({ userId, noteId, patch: dto });
  }
}
