import { Injectable } from '@nestjs/common';

import { ClientProxy, ClientProxyFactory } from '@nestjs/microservices';

import { RABBITMQ_CONFIG } from '../constants/rabbitmq.contants';

@Injectable()
export class RabbitMQService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create(RABBITMQ_CONFIG);
  }

  async sendMessage(routingKey: string, data: RabbitMessage) {
    console.log(routingKey, RABBITMQ_CONFIG, data);
    return this.client.send(routingKey, JSON.stringify(data));
  }
}
