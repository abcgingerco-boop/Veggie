'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { calculateGradeWiseStats } from '@/lib/calculations';
import { generateBuyerSummaryPDF, sharePDF } from '@/lib/pdf';
import type { BuyerSummaryData } from '@/lib/types';

export default function BuyerDetailPage({ params }: { params: Promise<{ id: string; grade: string }> }) {
  const { id: buyerId, grade } = use(params);
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || '';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { buyers, bagWeights, addBagWeight, deleteBagWeight, grades, fetchBuyers, fetchGrades, fetchBagWeightsForDate } = useStore();

  // Fallback fetch if store is empty (e.g., direct URL navigation)
  useEffect(() => {
    const needsFetch = buyers.length === 0 || grades.length === 0;
    if (needsFetch && date) {
      setLoading(true);
      Promise.all([
        fetchBuyers(),
        fetchGrades(),
        fetchBagWeightsForDate(date),
      ]).finally(() => setLoading(false));
    }
  }, [buyers.length, grades.length, date, fetchBuyers, fetchGrades, fetchBagWeightsForDate]);

  const generateBuyerSummary = () => {
    const allBuyerBags = bagWeights.filter(
      b => b.buyerId === buyerId && b.date === date
    );

    if (allBuyerBags.length === 0) {
      alert('No bags entered yet for this buyer');
      return;
    }

    // Group by grade
    const gradeGroups: Record<string, any[]> = {};
    allBuyerBags.forEach(bag => {
      if (!gradeGroups[bag.grade]) {
        gradeGroups[bag.grade] = [];
      }
      gradeGroups[bag.grade].push(bag);
    });

    // Calculate stats for each grade
    const gradeStats = Object.entries(gradeGroups).map(([gradeName, bags]) => {
      const stats = calculateGradeWiseStats(bags);
      return {
        grade: gradeName,
        bags,
        ...stats
      };
    });

    // Build summary text
    let summary = `📊 BUYER SUMMARY\n`;
    summary += `━━━━━━━━━━━━━━━━━━\n`;
    summary += `👤 Name: ${buyer?.name}\n`;
    if (buyer?.phone) summary += `📞 Phone: ${buyer.phone}\n`;
    summary += `📅 Date: ${date}\n`;
    summary += `━━━━━━━━━━━━━━━━━━\n\n`;

    gradeStats.forEach(stat => {
      summary += `🏷️ GRADE ${stat.grade}\n`;
      summary += `   Bags: ${stat.totalBags}\n`;
      summary += `   Gross Weight: ${stat.grossWeight} kg\n`;
      summary += `   Net Weight: ${stat.netWeight} kg\n`;
      summary += `   Individual Bags:\n`;
      stat.bags.forEach((bag: any) => {
        summary += `      • Bag #${bag.bagNumber}: ${bag.weight} kg\n`;
      });
      summary += `\n`;
    });

    summary += `━━━━━━━━━━━━━━━━━━\n`;
    summary += `Generated with Ginger Trading System`;

    // Share using Web Share API if available, otherwise copy to clipboard
    if (navigator.share) {
      navigator.share({
        title: `${buyer?.name} - Buyer Summary`,
        text: summary
      }).catch(() => {
        // If sharing fails, copy to clipboard
        navigator.clipboard.writeText(summary);
        alert('Summary copied to clipboard!');
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    }
  };

  const buyer = buyers.find(b => b.id === buyerId);
  const gradeInfo = grades.find(g => g.name === grade);
  const gradeColor = gradeInfo?.color || '#6366f1';

  const bags = bagWeights.filter(
    b => b.buyerId === buyerId && b.grade === grade && b.date === date
  );

  const stats = bags.length > 0 ? calculateGradeWiseStats(bags) : null;

  const handleBuyerPDF = async () => {
    if (!buyer || !stats) {
      alert('No bags entered yet');
      return;
    }
    const pdfData: BuyerSummaryData = {
      buyer,
      date,
      grades: [{
        grade,
        color: gradeColor,
        bags,
        totalBags: stats.totalBags,
        grossWeight: stats.grossWeight,
        netWeight: stats.netWeight,
      }],
    };
    const doc = generateBuyerSummaryPDF(pdfData);
    await sharePDF(doc, `${buyer.name}-Grade${grade}-${date}`);
  };

  const WEIGHT_OPTIONS = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65];

  const getWeightColor = (weight: number) => {
    if (weight < 55) return '#ef4444'; // Red - Light
    if (weight < 60) return '#f59e0b'; // Amber - Medium
    return '#10b981'; // Green - Heavy
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
        <div className="max-w-7xl mx-auto p-3 md:p-6">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!buyer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">?</div>
          <p className="text-xl text-gray-600">Buyer not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      <div className="max-w-7xl mx-auto p-3 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{buyer.name}</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div
                  className="px-3 py-1 rounded-full font-bold text-white shadow-md text-sm"
                  style={{ backgroundColor: gradeColor }}
                >
                  Grade {grade}
                </div>
                {buyer.phone && (
                  <span className="text-xs text-gray-600">📞 {buyer.phone}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateBuyerSummary}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                📤 Share
              </button>
              <button
                onClick={handleBuyerPDF}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                PDF
              </button>
              <button
                onClick={() => router.push(`/dashboard/${date}`)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Quick Weight Entry */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-base font-bold mb-3 text-gray-800 flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            QUICK WEIGHT ENTRY
          </h2>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {WEIGHT_OPTIONS.map(weight => (
              <button
                key={weight}
                disabled={submitting}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await addBagWeight(buyerId, grade, weight, date);
                  } catch {
                    alert('Failed to add bag. Please try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="aspect-square bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-lg rounded-lg transform hover:scale-110 active:scale-95 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:transform-none"
              >
                {weight}
              </button>
            ))}
          </div>
        </div>

        {/* Bingo Ticket Layout */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-base font-bold mb-3 text-gray-800 flex items-center gap-2">
            <span className="text-lg">🎫</span>
            BAGS - BINGO LAYOUT
          </h2>

          {bags.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🎫</div>
              <p className="text-base font-semibold">No bags entered yet</p>
              <p className="text-xs mt-2">Use the quick entry buttons above to add bags</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {bags.map((bag) => (
                <div
                  key={bag.id}
                  className="relative group"
                >
                  <div
                    className="aspect-square rounded-lg shadow-md flex flex-col items-center justify-center p-1 cursor-pointer hover:scale-110 transition-all transform"
                    style={{
                      backgroundColor: getWeightColor(bag.weight),
                      color: 'white'
                    }}
                  >
                    <div className="text-xs opacity-90 font-semibold">#{bag.bagNumber}</div>
                    <div className="text-xl font-extrabold">{bag.weight}</div>
                    <div className="text-xs opacity-90 font-medium">kg</div>
                  </div>

                  {/* Delete button on hover */}
                  <button
                    onClick={async () => {
                      if (confirm(`Delete bag #${bag.bagNumber} (${bag.weight} kg)?`)) {
                        try {
                          await deleteBagWeight(bag.id);
                        } catch {
                          alert('Failed to delete bag. Please try again.');
                        }
                      }
                    }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs shadow-md hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade-wise Summary */}
        {stats && (
          <div
            className="bg-white rounded-lg shadow-md p-4 border-2"
            style={{ borderColor: gradeColor }}
          >
            <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: gradeColor }}>
              <span className="text-lg">📊</span>
              GRADE {grade} SUMMARY
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-300">
                <div className="text-xs font-semibold text-blue-700 mb-1">Total Bags</div>
                <div className="text-3xl font-extrabold text-blue-900">{stats.totalBags}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center border border-purple-300">
                <div className="text-xs font-semibold text-purple-700 mb-1">Gross Weight</div>
                <div className="text-3xl font-extrabold text-purple-900">{stats.grossWeight}</div>
                <div className="text-xs font-semibold text-purple-700 mt-0.5">kg</div>
              </div>

              <div
                className="rounded-lg p-4 text-center border-2 shadow-md"
                style={{
                  backgroundColor: `${gradeColor}15`,
                  borderColor: gradeColor
                }}
              >
                <div className="text-xs font-bold mb-1" style={{ color: gradeColor }}>
                  NET WEIGHT
                </div>
                <div className="text-4xl font-black" style={{ color: gradeColor }}>
                  {stats.netWeight}
                </div>
                <div className="text-xs font-bold mt-0.5" style={{ color: gradeColor }}>kg</div>
              </div>
            </div>

            <div className="mt-3 p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
              <p className="text-xs text-gray-700 text-center">
                <span className="font-semibold">Formula:</span> Base (59 kg × bags) ± adjustments from 60 kg reference
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
