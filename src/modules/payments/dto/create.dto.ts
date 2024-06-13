import { createZodDto } from 'nestjs-zod';
import {z} from 'nestjs-zod/z'
import { ApiProperty} from '@nestjs/swagger';

const CreatePaymentSchema = z.object({
    name:z.string(),

})

export class CreatePaymentDTO extends createZodDto(CreatePaymentSchema){
    /** Payment type name */
    @ApiProperty()
    name:string;
}