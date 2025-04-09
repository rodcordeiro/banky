import { z } from 'zod';

export const stringSchema = z.string().trim();

export const stringToNumberSchema = stringSchema
  .refine(value => !Number.isNaN(+value))
  .transform(Number);

export const paginationParamsSchema = {
  limit: stringToNumberSchema.optional(),
  page: stringToNumberSchema.optional(),
};
