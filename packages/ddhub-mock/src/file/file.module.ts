import { Module } from '@nestjs/common';
import { FileFacade } from './file.facade';
import { FileService } from './file.service';

@Module({
  providers: [FileService, FileFacade],
  exports: [FileFacade],
})
export class FileModule {}
