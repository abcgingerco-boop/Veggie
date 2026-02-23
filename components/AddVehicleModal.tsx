'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { vehicleFormSchema, validateForm } from '@/lib/validation';

interface AddVehicleModalProps {
  date: string;
  onClose: () => void;
}

export function AddVehicleModal({ date, onClose }: AddVehicleModalProps) {
  const { grades, addVehicle } = useStore();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [gradeWiseBags, setGradeWiseBags] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateForm(vehicleFormSchema, { vehicleNumber, gradeWiseBags });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    setSubmitting(true);
    try {
      await addVehicle({
        date,
        vehicleNumber: validation.data.vehicleNumber,
        gradeWiseBags: validation.data.gradeWiseBags,
      });
      onClose();
    } catch {
      setError('Failed to add vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateGradeBags = (gradeName: string, value: string) => {
    const count = parseInt(value) || 0;
    if (count >= 0) {
      setGradeWiseBags(prev => ({
        ...prev,
        [gradeName]: count
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              🚛 Add Vehicle
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Vehicle Number *
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g., MH-01-1234"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-lg font-semibold uppercase text-black placeholder:text-gray-400"
                required
              />
            </div>

            {/* Grade-wise Bags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Grade-wise Bags *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {grades.filter(g => g.isActive).map(grade => (
                  <div
                    key={grade.id}
                    className="p-4 rounded-xl border-3"
                    style={{
                      borderColor: grade.color,
                      backgroundColor: `${grade.color}10`
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-lg" style={{ color: grade.color }}>
                        Grade {grade.name}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: grade.color }}
                      >
                        {grade.name}
                      </div>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={gradeWiseBags[grade.name] || ''}
                      onChange={(e) => updateGradeBags(grade.name, e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition outline-none text-center text-2xl font-bold text-black placeholder:text-gray-400"
                      style={{
                        '--tw-ring-color': grade.color
                      } as React.CSSProperties}
                    />
                    <div className="text-center text-xs text-gray-600 mt-1">bags</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total Bags:</span>
                <span className="text-3xl font-bold text-indigo-600">
                  {Object.values(gradeWiseBags).reduce((sum, count) => sum + count, 0)}
                </span>
              </div>
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
                {submitting ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
