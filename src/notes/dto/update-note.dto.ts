import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

import { NOTE_CONTENT_MAX_LENGTH, NOTE_TITLE_MAX_LENGTH } from '@/notes/notes.constants';

const trimIfString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateNoteDto {
  @Transform(trimIfString)
  @ValidateIf((dto: UpdateNoteDto) => dto.title !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(NOTE_TITLE_MAX_LENGTH)
  title?: string;

  // null разрешён и означает «очистить содержимое»; отсутствие ключа означает «не трогать».
  @ValidateIf((dto: UpdateNoteDto) => dto.content !== undefined && dto.content !== null)
  @IsString()
  @MaxLength(NOTE_CONTENT_MAX_LENGTH)
  content?: string | null;
}
