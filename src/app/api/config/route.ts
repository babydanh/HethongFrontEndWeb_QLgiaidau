import { NextResponse } from 'next/server';

/**
 * Expose non-secret runtime config to the browser.
 * NEXT_PUBLIC_* vars are inlined at build time and unusable in pre-built images.
 * This endpoint reads process.env at RUNTIME, so docker-compose values work.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const appApiKey =
    process.env.APP_API_KEY ||
    process.env.NEXT_PUBLIC_APP_API_KEY ||
    '';

  return NextResponse.json(
    { appApiKey },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}