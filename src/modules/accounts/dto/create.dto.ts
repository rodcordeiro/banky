import { createZodDto } from 'nestjs-zod';
import {z} from 'nestjs-zod/z'
import { ApiProperty} from '@nestjs/swagger';

const CreateAccountSchema = z.object({
    name:z.string(),
    ammount: z.number(),
})

export class CreateAccountDTO extends createZodDto(CreateAccountSchema){
    /** Account name */
    @ApiProperty()
    name:string;
}