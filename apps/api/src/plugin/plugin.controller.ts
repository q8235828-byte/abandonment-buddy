import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZipArchive } from 'archiver';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
      homepage:      'https://abandonmentbuddy.com',
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
}
