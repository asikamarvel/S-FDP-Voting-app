'use client';

import { Suspense } from 'react';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import LoginPage from '@/components/LoginPage';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

function PerformanceContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <PerformanceDashboard />;
}

export default function PerformancePage() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
        </div>
      }>
        <PerformanceContent />
      </Suspense>
    </main>
  );
}
