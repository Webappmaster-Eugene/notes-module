import { Module } from '@nestjs/common';

import { NotesController } from '@/notes/notes.controller';
import { NotesRepository } from '@/notes/notes.repository';
import { NotesService } from '@/notes/notes.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController],
  providers: [NotesService, NotesRepository],
  exports: [NotesService],
})
export class NotesModule {}
