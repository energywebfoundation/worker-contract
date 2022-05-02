import { Injectable } from '@nestjs/common';
import { FileService } from './file.service';

@Injectable()
export class FileFacade {
  constructor(private fileService: FileService) {}
  async saveFile({
    file,
    fileName,
  }: {
    fileName: string;
    file: Record<string, unknown>;
  }) {
    await this.fileService.saveFile({ file, fileName });
  }

  async getFile({ fileName }: { fileName: string }) {
    return await this.fileService.getFile({ fileName });
  }
}
