'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Heart, MessageCircle } from 'lucide-react';
import { Campaign, Post, validationApi, Vote } from '@/lib/api';

interface ValidationResultsProps {
  campaign: Campaign;
  posts: Post[];
}

export function ValidationResults({ campaign, posts }: ValidationResultsProps) {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['summary', campaign.id],
    queryFn: () => validationApi.getSummary(campaign.id),
  });

  if (isLoading) {
    return <p>Loading validation results...</p>;
  }

  if (!summaryData || summaryData.total_engagements === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-500">
          No validation results yet. Sync engagements and run validation first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Campaign Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total Engagements</p>
            <p className="text-2xl font-bold">{summaryData.total_engagements}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Valid Votes</p>
            <p className="text-2xl font-bold text-green-700">
              {summaryData.total_valid_votes}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">Invalid Votes</p>
            <p className="text-2xl font-bold text-red-700">
              {summaryData.total_invalid_votes}
            </p>
          </div>
          <div className="bg-primary-50 rounded-lg p-4">
            <p className="text-sm text-primary-600">Validation Rate</p>
            <p className="text-2xl font-bold text-primary-700">
              {summaryData.overall_validation_rate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Per-Post Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Results by Post</h3>
        {posts.map((post) => (
          <PostValidationCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}

function PostValidationCard({ post }: { post: Post }) {
  const { data: votes, isLoading } = useQuery({
    queryKey: ['votes', post.id],
    queryFn: () => validationApi.getResults(post.id),
  });

  const total = post.valid_vote_count + post.invalid_vote_count;
  const validPercent = total > 0 ? (post.valid_vote_count / total) * 100 : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium">Post: {post.platform_post_id}</h4>
          <p className="text-sm text-gray-500">
            {post.engagement_count} total engagements
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">
            <span className="text-green-600">{post.valid_vote_count}</span>
            {' / '}
            <span className="text-red-600">{post.invalid_vote_count}</span>
          </p>
          <p className="text-sm text-gray-500">{validPercent.toFixed(1)}% valid</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${validPercent}%` }}
        />
      </div>

      {/* Votes list */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading votes...</p>
      ) : votes && votes.length > 0 ? (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-2 py-1">User</th>
                <th className="text-left px-2 py-1">Type</th>
                <th className="text-left px-2 py-1">Status</th>
                <th className="text-left px-2 py-1">Reason</th>
              </tr>
            </thead>
            <tbody>
              {votes.slice(0, 20).map((vote: Vote) => (
                <tr key={vote.id} className="border-t border-gray-100">
                  <td className="px-2 py-1">
                    {vote.username || vote.platform_user_id}
                  </td>
                  <td className="px-2 py-1">
                    {vote.engagement_type === 'like' ? (
                      <Heart className="w-4 h-4 text-red-500" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-primary-500" />
                    )}
                  </td>
                  <td className="px-2 py-1">
                    {vote.is_valid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                  <td className="px-2 py-1 text-gray-500 text-xs">
                    {vote.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {votes.length > 20 && (
            <p className="text-center text-sm text-gray-500 py-2">
              Showing 20 of {votes.length} votes
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No votes validated yet.</p>
      )}
    </div>
  );
}
