import { Module } from '@nestjs/common';
import { CatalogoModule } from './catalogo/catalogo.module';

@Module({
  imports: [CatalogoModule],
  controllers: [],
  providers: [],
})
export class AppModule {}