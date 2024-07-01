import { Global, Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';

import { RABBITMQ_CONFIG } from './constants/rabbitmq.contants';
import { RabbitMQService } from './services/rabbitmq.service';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        ...RABBITMQ_CONFIG,
      },
    ]),
  ],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitModule {
  constructor() {}
}
