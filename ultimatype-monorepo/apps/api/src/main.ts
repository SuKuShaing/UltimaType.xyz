import { Logger, ValidationPipe, RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app/app.module';
import { RedisIoAdapter } from './gateway/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers
  // crossOriginEmbedderPolicy desactivado: los avatares de Google/GitHub no envían
  // CORP headers, y COEP "require-corp" los bloquearía en el browser.
  // imgSrc abierto a HTTPS para permitir avatares de cualquier CDN externa.
  // connectSrc incluye wss: para WebSocket de Socket.IO.
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
    }),
  );

  // Trust proxy only when explicitly enabled
  if (configService.get('TRUST_PROXY') === 'true') {
    app.set('trust proxy', 1);
  }

  // Enable CORS for HTTP endpoints
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:4200');
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Global validation pipe — strips unknown fields and transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: [{ path: 'u/:slug', method: RequestMethod.GET }],
  });

  // WebSocket con Redis adapter
  const redisUrl = configService.get('REDIS_URL', 'redis://localhost:6379');
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Graceful shutdown
  app.enableShutdownHooks();
  const shutdown = async () => {
    await redisIoAdapter.close();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
