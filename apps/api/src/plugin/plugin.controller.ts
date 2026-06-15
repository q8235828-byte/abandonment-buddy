import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
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

  @Get('info')
  getInfo() {
    const version   = readPluginVersion();
    const changelog = readChangelog();
    // Use API_URL env var (the Railway public URL) so download_url is always correct.
    // /plugin/download redirects to Vercel — no WEB_URL needed.
    const apiUrl    = (process.env.API_URL || 'https://abandonment-cart.up.railway.app').replace(/\/$/, '');

    return {
      name:          'Abandonment Buddy for WooCommerce',
      slug:          'abandonment-buddy',
      version,
      download_url:  `${apiUrl}/plugin/download`,
      changelog,
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
    const webUrl = (process.env.WEB_URL || 'https://abandonment-buddy.vercel.app').replace(/\/$/, '');
    res.redirect(302, `${webUrl}/abandonment-buddy.zip`);
  }
}
