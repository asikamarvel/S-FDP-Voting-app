'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoteSubmission } from '@/components/VoteSubmission';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const queryClient = new QueryClient();

function VotePageContent() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');
  
  if (!campaignId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-8 text-center max-w-md">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Premium Header */}
      <div className="relative bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="vote-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#vote-grid)"/>
          </svg>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center text-center">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl mb-4 border border-white/20">
              <Image
                src="/SFDP PNG 3.png"
                alt="SFDP Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <p className="text-primary-100 text-sm font-medium tracking-wide uppercase mb-1">
              Society for Disease Prevention
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Health Innovation Challenge
            </h1>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-accent-600/90 text-white text-sm font-semibold rounded-full shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Vote Now
            </span>
          </div>
        </div>
      </div>
      
      {/* Vote Form */}
      <div className="py-8">
        <VoteSubmission campaignId={parseInt(campaignId)} />
      </div>
    </div>
  );
}

export default function VotePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
          <div className="flex flex-col items-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-3" />
            <p className="text-sm text-gray-500">Loading voting form...</p>
          </div>
        </div>
      }>
        <VotePageContent />
      </Suspense>
    </QueryClientProvider>
  );
}
