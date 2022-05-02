import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FileFacade } from '../../file/file.facade';
import { FileUploadDTO } from './dto/fileUpload.dto';

@Controller('file')
export class FileController {
  constructor(private fileFacade: FileFacade) {}
  @Post()
  async saveFile(@Body() { file, fileName }: FileUploadDTO) {
    await this.fileFacade.saveFile({ file, fileName });
  }

  @Get(':fileName')
  async downloadFile(@Param('fileName') fileName: string) {
    const file = await this.fileFacade.getFile({ fileName });
    return { fileName, file };
  }
}
