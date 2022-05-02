import { ApiProperty } from '@nestjs/swagger';

export class FileUploadDTO {
  @ApiProperty()
  fileName: string;

  @ApiProperty()
  file: Record<string, any>;
}
