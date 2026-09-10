import * as Sentry from '@sentry/nextjs';
import { getSentrySampleRate } from './src/config/sentry';

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment:
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.NODE_ENV ||
    'production',
  release: process.env.SENTRY_RELEASE?.trim() || undefined,
  tracesSampleRate: getSentrySampleRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE,
  ),
  sendDefaultPii: false,
});

