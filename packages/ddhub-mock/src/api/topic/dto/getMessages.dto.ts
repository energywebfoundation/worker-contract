import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetMessagesDTO {
  @ApiProperty()
  @IsString()
  clientID: string;

  @ApiProperty()
  @IsString()
  topicName: string;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiProperty({ required: false, format: 'date-time' })
  @IsDateString()
  @IsOptional()
  from?: string;
}
