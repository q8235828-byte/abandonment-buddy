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

  // The zip is committed to the repo — serve directly from GitHub raw CDN.
  // No Vercel URL or WEB_URL env var needed.
  private static readonly ZIP_URL =
    'https://raw.githubusercontent.com/q8235828-byte/abandonment-buddy/main/apps/web/public/abandonment-buddy.zip';

  @Get('info')
  getInfo() {
    const version   = readPluginVersion();
    const changelog = readChangelog();

    return {
      name:          'Abandonment Buddy for WooCommerce',
      slug:          'abandonment-buddy',
      version,
      download_url:  PluginController.ZIP_URL,
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
    res.redirect(302, PluginController.ZIP_URL);
  }
}
