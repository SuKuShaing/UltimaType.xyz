import { join } from 'path';
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpaFallbackController } from './spa-fallback.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { TextsModule } from '../modules/texts/texts.module';
import { RedisModule } from '../redis/redis.module';
import { GameModule } from '../gateway/game.module';
import { LeaderboardModule } from '../modules/leaderboard/leaderboard.module';
import { OgProxyMiddleware } from '../middleware/og-proxy.middleware';

const envSchema = z.object({
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_EXPIRATION: z.string().default('24h'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_CALLBACK_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  TRUST_PROXY: z.string().default('false'),
});

@Module({
  imports: [
    // En producción, NestJS sirve la SPA y actúa como OG proxy para bots
    ...(process.env.NODE_ENV === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
            // Excluir rutas de la API — las maneja NestJS normalmente
            exclude: ['/api/*path', '/u/*path'],
            serveStaticOptions: {
              // Cache agresivo para assets con hash (JS, CSS), no-cache para index.html
              setHeaders: (res: any, filePath: string) => {
                if (filePath.endsWith('index.html')) {
                  res.setHeader('Cache-Control', 'no-cache');
                } else {
                  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
              },
            },
          }),
        ]
      : []),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    TextsModule,
    GameModule,
    LeaderboardModule,
  ],
  controllers: [AppController, SpaFallbackController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // path-to-regexp v8 (NestJS 11) requiere wildcard nombrado: *path en vez de *
    consumer.apply(OgProxyMiddleware).forRoutes('/u/*path');
  }
}
