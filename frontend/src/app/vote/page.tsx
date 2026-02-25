'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoteSubmission } from '@/components/VoteSubmission';

const queryClient = new QueryClient();

export default function VotePage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');
  
  if (!campaignId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Missing Campaign</h1>
          <p className="text-gray-500">
            Please use a valid voting link with a campaign ID.
            <br /><br />
            Example: /vote?campaign=1
          </p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <VoteSubmission campaignId={parseInt(campaignId)} />
      </div>
    </QueryClientProvider>
  );
}
