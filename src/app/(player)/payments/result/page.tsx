import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ResultClient from './ResultClient';

export const dynamic = 'force-dynamic';

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <ResultClient />
    </Suspense>
  );
}

