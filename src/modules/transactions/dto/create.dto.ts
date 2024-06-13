import { createZodDto } from 'nestjs-zod';
import {z} from 'nestjs-zod/z'
import { ApiProperty} from '@nestjs/swagger';

const CreateTransactionSchema = z.object({
    description: z.string(),
    account:z.string(),
    category:z.string(),
    payment_type:z.string(),
    value:z.number(),
})

export class CreateTransactionDTO extends createZodDto(CreateTransactionSchema){
    /** Transaction description */
    @ApiProperty()
    description:string;

    /** Transaction description */
    @ApiProperty()
    account:string;

    /** Transaction description */
    @ApiProperty()
    payment_type:string;
    
    /** Transaction description */
    @ApiProperty()
    value:number;
}