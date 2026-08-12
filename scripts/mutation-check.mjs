import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MUTATIONS = [
  {
    name: 'владение убрано из предиката запроса',
    file: 'src/notes/notes.repository.ts',
    from: 'where: { id: noteId, userId },',
    to: 'where: { id: noteId },',
  },
  {
    name: 'чужая заметка отвечает 403 вместо 404',
    file: 'src/notes/notes.service.ts',
    from: 'throw new NotFoundException({ code:',
    to: 'throw new ForbiddenException({ code:',
    extraFrom: 'import { BadRequestException, Injectable, NotFoundException }',
    extraTo: 'import { BadRequestException, ForbiddenException, Injectable, NotFoundException }',
  },
  {
    name: 'патч копируется целиком вместо выборки разрешённых полей',
    file: 'src/notes/notes.mapper.ts',
    from: '  const payload: NoteUpdatePayload = {};',
    to: '  const payload: NoteUpdatePayload = { ...patch };',
  },
  {
    name: 'явный null перестаёт очищать содержимое',
    file: 'src/notes/notes.mapper.ts',
    from: 'if (patch.content !== undefined) {',
    to: 'if (patch.content !== undefined && patch.content !== null) {',
  },
  {
    name: 'любая ошибка базы превращается в «не найдено»',
    file: 'src/notes/notes.repository.ts',
    from: '      if (isRecordNotFound(error)) {\n        return null;\n      }\n\n      throw error;',
    to: '      void error;\n\n      return null;',
  },
  {
    name: 'пустой патч больше не отклоняется',
    file: 'src/notes/notes.service.ts',
    from: 'if (Object.keys(payload).length === 0) {',
    to: 'if (false) {',
  },
  {
    name: 'заголовок из одних пробелов проходит валидацию',
    file: 'src/notes/dto/update-note.dto.ts',
    from: '  @MinLength(1)\n',
    to: '',
  },
  {
    name: 'заголовок перестаёт обрезаться',
    file: 'src/notes/dto/update-note.dto.ts',
    from: '  @Transform(trimIfString)\n',
    to: '',
  },
  {
    name: 'поля вне белого списка перестают отклоняться',
    file: 'src/common/validation-pipe.options.ts',
    from: 'forbidNonWhitelisted: true,',
    to: 'forbidNonWhitelisted: false,',
  },
  {
    name: 'ошибка валидации уходит из общего конверта',
    file: 'src/common/validation-pipe.options.ts',
    from: "code: 'VALIDATION_FAILED',",
    to: "code: 'BAD_REQUEST',",
  },
  {
    name: 'идентификаторы владельца и заметки переставлены местами',
    file: 'src/notes/notes.service.ts',
    from: 'updateOwned(command.userId, command.noteId, payload)',
    to: 'updateOwned(command.noteId, command.userId, payload)',
  },
  {
    name: 'кривой noteId перестаёт отсекаться на границе',
    file: 'src/notes/note-id.pipe.ts',
    from: "new BadRequestException({ code: 'INVALID_NOTE_ID', message: 'noteId must be a UUID' })",
    to: "new BadRequestException({ code: 'BAD_REQUEST', message: 'noteId must be a UUID' })",
  },
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let survived = 0;

for (const mutation of MUTATIONS) {
  const path = resolve(root, mutation.file);
  const original = readFileSync(path, 'utf8');

  let mutated = applyOnce(original, mutation.from, mutation.to, mutation.name);
  if (mutation.extraFrom !== undefined && mutation.extraTo !== undefined) {
    mutated = applyOnce(mutated, mutation.extraFrom, mutation.extraTo, mutation.name);
  }

  writeFileSync(path, mutated);

  const caught = runTests() === false;
  writeFileSync(path, original);

  if (caught) {
    console.log(`  поймана  — ${mutation.name}`);
  } else {
    survived += 1;
    console.log(`  ВЫЖИЛА   — ${mutation.name}`);
  }
}

console.log(`\n${MUTATIONS.length - survived}/${MUTATIONS.length} мутаций поймано тестами`);
process.exit(survived === 0 ? 0 : 1);

function applyOnce(source, from, to, name) {
  const first = source.indexOf(from);

  if (first === -1) {
    throw new Error(`мутация «${name}»: фрагмент не найден, поправьте скрипт`);
  }

  if (source.indexOf(from, first + from.length) !== -1) {
    throw new Error(`мутация «${name}»: фрагмент встречается несколько раз`);
  }

  return source.slice(0, first) + to + source.slice(first + from.length);
}

function runTests() {
  try {
    execFileSync('npx', ['vitest', 'run', '--silent'], { cwd: root, stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}
