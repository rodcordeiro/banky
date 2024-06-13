import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string(),
  HOST: z.string(),
  PORT: z.string(),
  ENC_SECRET: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES: z.string(),

  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PWD: z.string(),
  DB_NAME: z.string(),

  FTP_HOST: z.string(),
  FTP_PORT: z.string().transform(port => +port),
  FTP_USER: z.string(),
  FTP_PWD: z.string(),

  DEBUG: z.boolean().optional().default(false),
});

export type EnvType = z.infer<typeof envSchema>;

export const ENV_VARIABLES = envSchema.parse(process.env);
