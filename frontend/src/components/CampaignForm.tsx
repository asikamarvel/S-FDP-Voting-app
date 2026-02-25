'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { campaignApi, Campaign } from '@/lib/api';

interface CampaignFormProps {
  onClose: () => void;
  onSuccess: () => void;
  campaign?: Campaign; // If provided, we're editing
  defaultPlatform?: 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook';
}

export function CampaignForm({ onClose, onSuccess, campaign, defaultPlatform }: CampaignFormProps) {
  const isEditing = !!campaign;
  
  const [formData, setFormData] = useState({
    name: '',
    platform: (defaultPlatform || 'twitter') as 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook',
    official_account_id: '',
    official_account_username: '',
    description: '',
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        platform: campaign.platform,
        official_account_id: campaign.official_account_id,
        official_account_username: campaign.official_account_username || '',
        description: campaign.description || '',
      });
    }
  }, [campaign]);

  const createMutation = useMutation({
    mutationFn: campaignApi.create,
    onSuccess: () => {
      onSuccess();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => campaignApi.update(campaign!.id, data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isError = createMutation.isError || updateMutation.isError;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{isEditing ? 'Edit Campaign' : 'Create New Campaign'}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="My Voting Competition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform
          </label>
          <select
            value={formData.platform}
            onChange={(e) =>
              setFormData({
                ...formData,
                platform: e.target.value as typeof formData.platform,
              })
            }
            disabled={isEditing} // Can't change platform after creation
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
          >
            <option value="twitter">Twitter / X</option>
            <option value="youtube">YouTube</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
          </select>
          {isEditing && <p className="text-xs text-gray-500 mt-1">Platform cannot be changed after creation</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Official Account ID
          </label>
          <input
            type="text"
            required
            value={formData.official_account_id}
            onChange={(e) =>
              setFormData({ ...formData, official_account_id: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Platform-specific account ID"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.platform === 'twitter' ? 'Your Twitter User ID (e.g., 1268115669658341377)' : 'The numeric ID from the platform API'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username (Optional)
          </label>
          <input
            type="text"
            value={formData.official_account_username}
            onChange={(e) =>
              setFormData({ ...formData, official_account_username: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="@username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            placeholder="Brief description of this campaign"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {isPending ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Campaign')}
          </button>
        </div>

        {isError && (
          <p className="text-sm text-red-600">
            Error {isEditing ? 'updating' : 'creating'} campaign. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
