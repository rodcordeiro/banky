import { ApiProperty } from '@nestjs/swagger';

export class ProcessingDto {
  @ApiProperty()
  text: string;
}
