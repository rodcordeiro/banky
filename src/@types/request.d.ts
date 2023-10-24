import { FastifyRequest } from 'fastify';
import { UsersEntity } from '@/modules/users/entities/users.entity';

declare global {
  export type BankyRequest = {
    user: UsersEntity;
  } & FastifyRequest;
}
