import { ClientProviderOptions, Transport } from '@nestjs/microservices';
import { ENV_VARIABLES } from '@/common/config/env.config';

export const RABBITMQ_CONFIG = {
  transport: Transport.RMQ,
  options: {
    urls: [ENV_VARIABLES.RABBIT_URL],
    queue: ENV_VARIABLES.RABBIT_QUEUE,
    queueOptions: {
      durable: true,
    },
    exchange: 'xxx',
    exchangeType: 'topic',
  },
} as unknown as ClientProviderOptions;
