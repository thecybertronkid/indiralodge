import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getDatabaseUrl(): string {
  // On Vercel serverless environment, current directory (/var/task) is read-only.
  // SQLite needs write access to journal/database, so we copy the template DB to temp directory
  if (process.env.VERCEL) {
    const tmpDir = os.tmpdir();
    const tmpDbPath = path.join(tmpDir, 'indira_lodge.db');

    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(process.cwd(), 'dev.db'),
      ];

      for (const sourcePath of candidates) {
        if (fs.existsSync(sourcePath)) {
          try {
            fs.copyFileSync(sourcePath, tmpDbPath);
            break;
          } catch (err) {
            console.error('Failed to copy SQLite database to temp dir:', err);
          }
        }
      }
    }

    if (fs.existsSync(tmpDbPath)) {
      const normalizedPath = tmpDbPath.replace(/\\/g, '/');
      return `file:${normalizedPath}`;
    }
  }

  return process.env.DATABASE_URL || 'file:./prisma/dev.db';
}

const dbUrl = getDatabaseUrl();

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
