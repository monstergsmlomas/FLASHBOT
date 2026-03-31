import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SparePartsService } from './spare-parts.service';
import { SparePartsController } from './spare-parts.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    // Guardamos el archivo en memoria (Buffer) para procesar el Excel sin tocar el disco
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [SparePartsController],
  providers: [SparePartsService, PrismaService],
  exports: [SparePartsService], // exportado para que WhatsApp bot pueda usar searchFuzzy
})
export class SparePartsModule {}
