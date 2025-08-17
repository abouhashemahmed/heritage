import { PrismaClient } from '@prisma/client';

class Database {
  private static instance: PrismaClient;
  private static isTesting = process.env.NODE_ENV === 'test';

  public static getInstance(): PrismaClient {
    if (!Database.instance) {
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);

      Database.instance = new PrismaClient({
        log: Database.getLogLevel(),
        datasources: {
          db: {
            url: process.env.DATABASE_URL?.includes('?')
              ? `${process.env.DATABASE_URL}&connection_limit=20&pool_timeout=30`
              : `${process.env.DATABASE_URL}?connection_limit=20&pool_timeout=30`
          }
        }
      });

      Database.registerHooks();
      Database.testConnection().catch((error) => {
        console.error('❌ Initial DB connection failed:', error);
        process.exit(1);
      });
    }
    return Database.instance;
  }

  private static getLogLevel() {
    return Database.isTesting
      ? ['error']
      : [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' }
        ];
  }

  private static async testConnection(retries = 3): Promise<void> {
    try {
      await Database.instance.$queryRaw`SELECT 1`;
      console.log('✅ Database connection established');
    } catch (error) {
      if (retries > 0) {
        console.warn(`🔁 Retrying connection (${retries} left)...`);
        await new Promise((res) => setTimeout(res, 2000));
        return Database.testConnection(retries - 1);
      }
      throw error;
    }
  }

  private static registerHooks() {
    process.once('SIGINT', Database.gracefulShutdown);
    process.once('SIGTERM', Database.gracefulShutdown);

    // Ping DB every 60 seconds to keep the pool alive
    setInterval(() => {
      Database.instance.$queryRaw`SELECT 1`.catch(() => {
        console.warn('🔄 Reconnecting lost database connection...');
        Database.instance.$connect().catch((err) => {
          console.error('Reconnect failed:', err);
        });
      });
    }, 60_000);
  }

  private static gracefulShutdown = async () => {
    console.log('🛑 Disconnecting Prisma...');
    try {
      await Database.instance.$disconnect();
      process.exit(0);
    } catch (error) {
      console.error('Shutdown error:', error);
      process.exit(1);
    }
  };
}

// Type-safe helper for Prisma transaction blocks
export type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];
export const prisma = Database.getInstance();
