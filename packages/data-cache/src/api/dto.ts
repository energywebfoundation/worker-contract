import { IsString } from 'class-validator';

export class FeedMatchResultRequest {
  @IsString()
  rootHash!: string;
}