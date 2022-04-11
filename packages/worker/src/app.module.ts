import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OverseerModule } from './overseer/overseer.module';

@Module({
  imports: [OverseerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
