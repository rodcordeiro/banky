import { FastifyRequest } from 'fastify';

declare global {
  export type BankyRequest = {
    user: UsersEntity;
  } & FastifyRequest;
}
