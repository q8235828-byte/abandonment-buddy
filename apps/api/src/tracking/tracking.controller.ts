import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

@Controller('track')
export class TrackingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('open/:orderId.png')
  async trackOpen(@Param('orderId') orderId: string, @Res() res: Response) {
    this.prisma.abandonedOrder
      .updateMany({
        where: { id: orderId, emailOpenedAt: null },
        data:  { emailOpenedAt: new Date() },
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
    @Res() res: Response,
  ) {
    this.prisma.abandonedOrder
      .updateMany({
        where: { id: orderId, emailClickedAt: null },
        data:  { emailClickedAt: new Date() },
      })
      .catch(() => {});

    res.redirect(302, url || '/');
  }
}
