import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/keep-alive
 * This endpoint is triggered by Vercel Cron to ping the Supabase DB
 * and prevent it from being paused due to inactivity (7-day rule).
 */
export async function GET(req: Request) {
    // Verify cron execution (optional but recommended in Vercel)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Execute a lightweight query to ensure the database registers activity
        await prisma.$queryRaw`SELECT 1`;
        
        console.log('[CRON] Database keep-alive ping successful.');
        return NextResponse.json({ success: true, message: 'Database is awake.' });
    } catch (error) {
        console.error('[CRON] Database keep-alive failed:', error);
        return NextResponse.json({ error: 'Failed to ping database' }, { status: 500 });
    }
}
