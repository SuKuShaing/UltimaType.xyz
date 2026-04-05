import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

const BOT_USER_AGENTS = [
  'WhatsApp',
  'Twitterbot',
  'facebookexternalhit',
  'Googlebot',
  'LinkedInBot',
  'Slackbot',
  'Discordbot',
];

export function isBot(userAgent: string): boolean {
  return BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));
}

@Injectable()
export class OgProxyMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] ?? '';

    if (!isBot(userAgent)) {
      return next();
    }

    // Extract slug from path: /u/:slug
    const match = req.path.match(/^\/u\/([a-z0-9][a-z0-9-]{1,28}[a-z0-9])$/);
    if (!match) {
      return next();
    }

    const slug = match[1];

    try {
      const user = await this.prisma.user.findUnique({
        where: { slug },
        select: {
          displayName: true,
          avatarUrl: true,
          countryCode: true,
          slug: true,
        },
      });

      if (!user) {
        return next();
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const description = `Perfil de ${user.displayName} en UltimaType`;
      const ogImage = user.avatarUrl ?? '';

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <title>${user.displayName} — UltimaType</title>
  <meta name="description" content="${description}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${user.displayName} — UltimaType">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${baseUrl}/u/${user.slug}">
  <meta name="twitter:card" content="summary">
</head>
<body></body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    } catch {
      return next();
    }
  }
}
