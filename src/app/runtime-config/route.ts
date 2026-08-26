import { NextResponse } from 'next/server';

/**
 * Runtime configuration for the browser.
 * This route intentionally lives outside /api because /api is proxied to the
 * Backend API in production, while the value must be read by the Web server.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const appApiKey = process.env.APP_API_KEY || process.env.NEXT_PUBLIC_APP_API_KEY || '';

  return NextResponse.json(
    { appApiKey },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
