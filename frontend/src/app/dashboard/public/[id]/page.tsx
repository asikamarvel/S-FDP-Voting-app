'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PublicDashboard } from '@/components/PublicDashboard';
import { Loader2 } from 'lucide-react';

function PublicDashboardContent() {
  const params = useParams();
  const campaignId = params.id as string;

  return (
    <PublicDashboard 
      campaignId={Number(campaignId)} 
    />
  );
}

export default function PublicDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-3" />
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    }>
      <PublicDashboardContent />
    </Suspense>
  );
}
