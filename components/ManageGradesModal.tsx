'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { gradeFormSchema, validateForm } from '@/lib/validation';

interface ManageGradesModalProps {
  date: string;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#a855f7', // Violet
];

export function ManageGradesModal({ date, onClose }: ManageGradesModalProps) {
  const { grades, addGrade, updateGrade, deleteGrade } = useStore();
  const [newGradeName, setNewGradeName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editColor, setEditColor] = useState('');

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateForm(gradeFormSchema, { name: newGradeName, color: selectedColor });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      setError(firstError);
      return;
    }

    // Check if grade already exists (external duplicate check)
    if (grades.some(g => g.name.toUpperCase() === validation.data.name)) {
      setError('This grade already exists');
      return;
    }

    setSubmitting(true);
    try {
      await addGrade(validation.data.name, validation.data.color, date);
      setNewGradeName('');
      setSelectedColor(PRESET_COLORS[0]);
    } catch {
      setError('Failed to add grade. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              🏷️ Manage Grades
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ✕
            </button>
          </div>

          {/* Current Grades */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Active Grades</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {grades.filter(g => g.isActive).map(grade => (
                <div
                  key={grade.id}
                  className="p-4 rounded-xl border-3"
                  style={{
                    borderColor: editingId === grade.id ? editColor : grade.color,
                    backgroundColor: `${editingId === grade.id ? editColor : grade.color}15`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: editingId === grade.id ? editColor : grade.color }}
                      >
                        {grade.name}
                      </div>
                      <span className="font-bold text-xl" style={{ color: editingId === grade.id ? editColor : grade.color }}>
                        Grade {grade.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (editingId === grade.id) {
                            setEditingId(null);
                          } else {
                            setEditingId(grade.id);
                            setEditColor(grade.color);
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition text-gray-500 hover:text-gray-700"
                        title="Edit color"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Delete Grade ${grade.name}? It will be deactivated.`)) {
                            try {
                              await deleteGrade(grade.id);
                            } catch {
                              alert('Failed to delete grade.');
                            }
                          }
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-100 transition text-gray-400 hover:text-red-500"
                        title="Delete grade"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Inline color editor */}
                  {editingId === grade.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="grid grid-cols-5 gap-1.5 mb-3">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setEditColor(color)}
                            className={`w-full aspect-square rounded-lg transition-all transform ${
                              editColor === color
                                ? 'scale-110 ring-3 ring-offset-1'
                                : 'hover:scale-105'
                            }`}
                            style={{
                              backgroundColor: color,
                              '--tw-ring-color': color
                            } as React.CSSProperties}
                          >
                            {editColor === color && (
                              <span className="text-white text-sm font-bold">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateGrade(grade.id, editColor);
                            setEditingId(null);
                          } catch {
                            alert('Failed to update color.');
                          }
                        }}
                        className="w-full px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg text-sm hover:from-indigo-700 hover:to-purple-700 transition"
                      >
                        Save Color
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Grade */}
          <div className="border-t-2 border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New Grade</h3>
            <form onSubmit={handleAddGrade} className="space-y-6">
              {/* Grade Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Grade Name *
                </label>
                <input
                  type="text"
                  value={newGradeName}
                  onChange={(e) => setNewGradeName(e.target.value)}
                  placeholder="e.g., D, Premium, Super"
                  maxLength={10}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-lg font-semibold uppercase text-black placeholder:text-gray-400"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Color *
                </label>
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-full aspect-square rounded-xl transition-all transform ${
                        selectedColor === color
                          ? 'scale-110 ring-4 ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: color,
                        '--tw-ring-color': color
                      } as React.CSSProperties}
                    >
                      {selectedColor === color && (
                        <span className="text-white text-2xl font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                <div className="text-sm font-semibold text-gray-600 mb-2">Preview:</div>
                <div
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-xl"
                  style={{
                    backgroundColor: `${selectedColor}20`,
                    borderLeft: `6px solid ${selectedColor}`
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {newGradeName.trim() || '?'}
                  </div>
                  <span className="font-bold text-2xl" style={{ color: selectedColor }}>
                    Grade {newGradeName.trim() || '...'}
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
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:transform-none"
                >
                  {submitting ? 'Adding...' : 'Add Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
