import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const geoip    = require('geoip-lite') as typeof import('geoip-lite');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const UAParser = (require('ua-parser-js') as any).UAParser ?? require('ua-parser-js');

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return (typeof fwd === 'string' ? fwd : fwd[0]).split(',')[0].trim();
  return (req.socket?.remoteAddress ?? req.ip ?? '').replace('::ffff:', '');
}

function extractVisitorInfo(req: Request) {
  const ip  = getClientIp(req);
  const geo = ip ? geoip.lookup(ip) : null;

  const ua     = new UAParser(req.headers['user-agent'] || '');
  const browser = ua.getBrowser();
  const os      = ua.getOS();
  const device  = ua.getDevice();
  const deviceType = device.type === 'mobile' ? 'mobile' : device.type === 'tablet' ? 'tablet' : 'desktop';

  return {
    customerIp:      ip || null,
    customerCountry: geo?.country ?? null,
    customerCity:    geo?.city    ?? null,
    customerRegion:  geo?.region  ?? null,
    customerIsp:     (geo as any)?.org ?? null,
    customerDevice:  deviceType,
    customerBrowser: browser.name ?? null,
    customerOs:      os.name      ?? null,
  };
}

@Controller('track')
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('open/:orderId.png')
  async trackOpen(@Param('orderId') orderId: string, @Req() req: Request, @Res() res: Response) {
    const visitor = extractVisitorInfo(req);

    this.prisma.abandonedOrder
      .updateMany({
        where: { id: orderId, emailOpenedAt: null },
        data:  { emailOpenedAt: new Date(), ...visitor },
      })
      .catch(() => {});

    res.set({
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma':        'no-cache',
    });
    res.send(PIXEL);
  }

  @Get('click/:orderId')
  async trackClick(
    @Param('orderId') orderId: string,
    @Query('url') url: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const visitor = extractVisitorInfo(req);

    this.prisma.abandonedOrder
      .updateMany({
        where: { id: orderId, emailClickedAt: null },
        data:  { emailClickedAt: new Date(), ...visitor },
      })
      .catch(() => {});

    res.redirect(302, url || '/');
  }
}
