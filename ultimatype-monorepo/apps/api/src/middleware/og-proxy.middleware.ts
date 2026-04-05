import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
          id: true,
          displayName: true,
          avatarUrl: true,
          countryCode: true,
          slug: true,
        },
      });

      if (!user) {
        return next();
      }

      const stats = await this.prisma.matchResult.aggregate({
        where: { userId: user.id },
        _max: { score: true, level: true },
      });

      const descParts: string[] = [`Perfil de ${user.displayName} en UltimaType`];
      if (user.countryCode) descParts.push(user.countryCode);
      if (stats._max.score != null) descParts.push(`Mejor: ${Math.round(stats._max.score)} pts`);
      if (stats._max.level != null) descParts.push(`Nivel ${stats._max.level}`);

      const baseUrl = process.env.FRONTEND_URL!;
      const safeName = escapeHtml(user.displayName);
      const safeDescription = escapeHtml(descParts.join(' · '));
      const safeImage = escapeHtml(user.avatarUrl ?? '');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <title>${safeName} — UltimaType</title>
  <meta name="description" content="${safeDescription}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${safeName} — UltimaType">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:image" content="${safeImage}">
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
