import { Injectable } from '@nestjs/common';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const fileDirectory = join(__dirname, '..', '..', 'files');

@Injectable()
export class FileService {
  async saveFile({
    file,
    fileName,
  }: {
    fileName: string;
    file: Record<string, any>;
  }) {
    await writeFile(join(fileDirectory, fileName), JSON.stringify(file));
  }

  async getFile({ fileName }: { fileName: string }) {
    const file = await readFile(join(fileDirectory, fileName));
    return JSON.parse(file.toString());
  }
}
