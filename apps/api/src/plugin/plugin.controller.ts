import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

const PLUGIN_DIR  = path.resolve(__dirname, '../../../../plugins/abandonment-buddy');
const PLUGIN_FILE = path.join(PLUGIN_DIR, 'abandonment-buddy.php');
const README_FILE = path.join(PLUGIN_DIR, 'readme.txt');

function readPluginVersion(): string {
  try {
    const src   = fs.readFileSync(PLUGIN_FILE, 'utf-8');
    const match = src.match(/\*\s*Version:\s*(.+)/);
    return match ? match[1].trim() : '1.0.0';
  } catch { return '1.0.0'; }
}

function readChangelog(): string {
  try {
    const txt     = fs.readFileSync(README_FILE, 'utf-8');
    const section = txt.match(/== Changelog ==([\s\S]*?)(?:==\s|$)/i);
    return section ? section[1].trim() : '';
  } catch { return ''; }
}

@Controller('plugin')
export class PluginController {
  constructor(private readonly prisma: PrismaService) {}

  private baseUrl(req: Request): string {
    if (process.env.API_URL) return process.env.API_URL.replace(/\/$/, '');
    const proto = (req.headers['x-forwarded-proto'] as string) ?? req.protocol;
    return `${proto}://${req.get('host')}`;
  }

  @Get('info')
  getInfo(@Req() req: Request) {
    return {
      name:          'Abandonment Buddy for WooCommerce',
      slug:          'abandonment-buddy',
      version:       readPluginVersion(),
      download_url:  `${this.baseUrl(req)}/plugin/download`,
      changelog:     readChangelog(),
      requires:      '5.8',
      requires_php:  '7.0',
      tested_up_to:  '6.7',
      last_updated:  new Date().toISOString().slice(0, 10),
      author:        'Abandonment Buddy',
      homepage:      'https://knowlity.org',
    };
  }

  @Get('download')
  download(@Res() res: Response) {
    if (!fs.existsSync(PLUGIN_DIR)) {
      res.status(404).json({ error: 'Plugin source not found on server' });
      return;
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="abandonment-buddy.zip"');

    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err: Error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);
    archive.directory(PLUGIN_DIR, 'abandonment-buddy');
    void archive.finalize();
  }

  @Get('stats')
  async getStats(@Req() req: Request) {
    const apiKey  = req.headers['x-ab-api-key']  as string;
    const storeId = req.headers['x-ab-store-id'] as string;

    if (!apiKey || !storeId) {
      return { error: 'Missing credentials' };
    }

    const store = await this.prisma.store.findFirst({
      where: { id: storeId, apiKey },
      include: { abandonedOrders: true },
    });

    if (!store) {
      return { error: 'Invalid credentials' };
    }

    const orders    = store.abandonedOrders;
    const recovered = orders.filter((o) => o.status === 'RECOVERED');
    const revenue   = recovered.reduce((s, o) => s + Number(o.cartValue ?? 0), 0);

    const emailSent    = orders.filter((o) => o.emailSentAt).length;
    const whatsappSent = orders.filter((o) => (o as any).whatsappSentAt).length;
    const smsSent      = orders.filter((o) => (o as any).smsSentAt).length;

    const emailRecovered    = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'EMAIL').length;
    const whatsappRecovered = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'WHATSAPP').length;
    const smsRecovered      = orders.filter((o) => o.status === 'RECOVERED' && (o as any).recoveredBy === 'SMS').length;

    return {
      totalCarts:       orders.length,
      abandonedCarts:   orders.filter((o) => o.isAbandoned).length,
      recoveredCarts:   recovered.length,
      revenueRecovered: revenue,
      recoveryRate:     orders.length ? Math.round((recovered.length / orders.length) * 100) : 0,
      emailSent,
      whatsappSent,
      smsSent,
      messagesSent:     emailSent + whatsappSent + smsSent,
      emailRecovered,
      whatsappRecovered,
      smsRecovered,
    };
  }

  /** Called by the WP plugin after each email step is sent via wp_mail(). */
  @Post('email-step')
  async markEmailStep(@Req() req: Request, @Body() body: { session_id: string; step: number }) {
    const apiKey  = req.headers['x-ab-api-key']  as string;
    const storeId = req.headers['x-ab-store-id'] as string;

    if (!apiKey || !storeId || !body.session_id || !body.step) {
      return { error: 'Missing required fields' };
    }

    const store = await this.prisma.store.findFirst({ where: { id: storeId, apiKey } });
    if (!store) return { error: 'Invalid credentials' };

    const order = await this.prisma.abandonedOrder.findFirst({
      where: { storeId: store.id, sessionId: body.session_id },
    });
    if (!order) return { error: 'Order not found' };

    const field = body.step === 1 ? 'emailSentAt' : body.step === 2 ? 'emailStep2SentAt' : 'emailStep3SentAt';
    const now   = new Date();

    await this.prisma.abandonedOrder.update({
      where: { id: order.id },
      data:  { [field]: now },
    });

    return { ok: true, field, time: now.toISOString() };
  }
}
