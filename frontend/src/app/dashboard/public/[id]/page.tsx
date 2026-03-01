'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PerformanceDashboard } from '@/components/PerformanceDashboard';
import { Loader2 } from 'lucide-react';

function PublicDashboardContent() {
  const params = useParams();
  const campaignId = params.id as string;

  return (
    <PerformanceDashboard 
      isPublic={true} 
      publicCampaignId={Number(campaignId)} 
    />
  );
}

export default function PublicDashboardPage() {
  return (
    <main className="min-h-screen">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
        </div>
      }>
        <PublicDashboardContent />
      </Suspense>
    </main>
  );
}
