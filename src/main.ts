import 'newrelic';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { VersioningType } from '@nestjs/common';
import helmet from '@fastify/helmet';
import compression from '@fastify/compress';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyCsrf from '@fastify/csrf-protection';

import { AppModule } from '@/app.module';
import { AppUtils } from '@/common/utils/app.util';
import { DataBaseInterceptor } from '@/common/interceptors/databaseError.interceptor';
import { BadRequestInterceptor } from '@/common/interceptors/badRequestError.interceptor';

import { version } from '../package.json';
import { RABBITMQ_CONFIG } from './core/rabbitmq/constants/rabbitmq.contants';
import { MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  AppUtils.killAppWithGrace(app);

  /**
   * ------------------------------------------------------
   * Security
   * ------------------------------------------------------
   */
  await app.register(helmet);
  await app.register(compression, {
    global: true,
    threshold: 1,
    encodings: ['gzip', 'deflate'],
  });
  await app.register(fastifyCsrf, {
    sessionPlugin: '@fastify/secure-session',
    getToken: function (req: any) {
      console.log(req.headers);
      return req.headers['csrf-token'];
    },
  });

  /**
   * ------------------------------------------------------
   * Global Config
   * ------------------------------------------------------
   */
  app.enableCors({
    origin: '*',
    methods: '*',
  });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    defaultVersion: '1',
    type: VersioningType.URI,
  });

  /**
   * -----------------------------------------------------------------------------
   * HTTP Interceptor
   * -----------------------------------------------------------------------------
   */
  app.useGlobalInterceptors(new DataBaseInterceptor());
  app.useGlobalInterceptors(new BadRequestInterceptor());

  /**
   * MICROSERVICES
   */
  app.connectMicroservice<MicroserviceOptions>(RABBITMQ_CONFIG);
  // await app.startAllMicroservices();

  /**
   * ------------------------------------------------------
   * Swagger
   * ------------------------------------------------------
   */
  const config = new DocumentBuilder()
    .setTitle('Banky API')
    .setDescription('Banky RestAPI documentation and examples')
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('/swagger', app, document);

  await app.listen(process.env.PORT, '0.0.0.0', (err, address) => {
    if (err) {
      throw err;
    }
    console.log('listening on: ' + address);
  });
}
bootstrap();
