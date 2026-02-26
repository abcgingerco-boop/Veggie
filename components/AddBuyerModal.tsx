'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { buyerFormSchema, validateForm } from '@/lib/validation';
import type { Buyer } from '@/lib/types';

interface AddBuyerModalProps {
  onClose: () => void;
  date: string;
  buyer?: Buyer;
}

export function AddBuyerModal({ onClose, date, buyer }: AddBuyerModalProps) {
  const { addBuyer, updateBuyer, buyers } = useStore();
  const isEditing = !!buyer;
  const [name, setName] = useState(buyer?.name || '');
  const [phone, setPhone] = useState(buyer?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateForm(buyerFormSchema, { name, phone });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    // Check for duplicate buyer name (exclude current buyer when editing)
    const duplicate = buyers.some(b => {
      if (isEditing && b.id === buyer.id) return false;
      return b.name.toLowerCase().trim() === validation.data.name.toLowerCase().trim();
    });
    if (duplicate) {
      setError('A buyer with this name already exists.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await updateBuyer(buyer.id, {
          name: validation.data.name,
          phone: validation.data.phone,
        });
      } else {
        await addBuyer({
          name: validation.data.name,
          phone: validation.data.phone,
          isActive: true,
          date,
        });
      }
      onClose();
    } catch {
      setError(isEditing ? 'Failed to update buyer. Please try again.' : 'Failed to add buyer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {isEditing ? '✏️ Edit Buyer' : '👤 Add Buyer'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Buyer Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buyer Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Rajesh Kumar"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-lg font-semibold text-black placeholder:text-gray-400"
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 9876543210"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-lg text-black placeholder:text-gray-400"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:transform-none"
              >
                {submitting
                  ? (isEditing ? 'Saving...' : 'Adding...')
                  : (isEditing ? 'Save Changes' : 'Add Buyer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
