import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver') as typeof import('archiver');

// Resolve paths relative to this file's compiled location:
// dist/plugin/ → ../../../../plugins/abandonment-buddy
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
    const version  = readPluginVersion();
    const changelog = readChangelog();
    const apiUrl   = process.env.API_URL || 'http://localhost:3001';

    return {
      name:           'Abandonment Buddy for WooCommerce',
      slug:           'abandonment-buddy',
      version,
      download_url:   `${apiUrl}/plugin/download`,
      changelog,
      requires:       '5.8',
      requires_php:   '7.4',
      tested_up_to:   '6.7',
      last_updated:   new Date().toISOString().slice(0, 10),
      author:         'Abandonment Buddy',
      homepage:       'https://abandonmentbuddy.com',
    };
  }

  @Get('download')
  async download(@Res() res: Response) {
    if (!fs.existsSync(PLUGIN_DIR)) {
      res.status(404).json({ message: 'Plugin source not found' });
      return;
    }

    const version = readPluginVersion();
    const filename = `abandonment-buddy-${version}.zip`;

    res.set({
      'Content-Type':        'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-cache',
    });

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    });

    archive.pipe(res);
    archive.directory(PLUGIN_DIR, 'abandonment-buddy');
    await archive.finalize();
  }
}
