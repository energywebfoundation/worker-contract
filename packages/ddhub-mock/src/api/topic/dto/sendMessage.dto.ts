import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

export class SendMessageDTO {
  @IsString()
  @ApiProperty()
  topicName: string;

  @IsDefined()
  @ApiProperty()
  message: any;
}
