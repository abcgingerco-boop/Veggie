'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { calculateGradeWiseStats, formatDisplayDate, calculateAmount } from '@/lib/calculations';
import { generateBuyerSummaryPDF, sharePDF } from '@/lib/pdf';
import { generateBuyerReportImage, shareReportImage } from '@/lib/report-image';
import { useOnlineStatus } from '@/components/OnlineStatus';
import type { BuyerSummaryData } from '@/lib/types';

export default function BuyerDetailPage({ params }: { params: Promise<{ id: string; grade: string }> }) {
  const { id: buyerId, grade: rawGrade } = use(params);
  const grade = decodeURIComponent(rawGrade);
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || '';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const isOnline = useOnlineStatus();

  const { buyers, bagWeights, addBagWeight, deleteBagWeight, grades, vehicles, fetchBuyers, fetchGrades, fetchBagWeightsForDate, fetchVehiclesForDate, fetchBuyerRatesForDate, getInventory, getBuyerRate, setBuyerRate } = useStore();

  const loadData = () => {
    setLoading(true);
    setFetchError('');
    Promise.all([
      fetchBuyers(date),
      fetchGrades(date),
      fetchBagWeightsForDate(date),
      fetchVehiclesForDate(date),
      fetchBuyerRatesForDate(date),
    ])
      .catch(() => setFetchError('Failed to load data. Please check your connection.'))
      .finally(() => setLoading(false));
  };

  // Fallback fetch if store is empty (e.g., direct URL navigation)
  useEffect(() => {
    const needsFetch = buyers.length === 0 || grades.length === 0;
    if (needsFetch && date) {
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers.length, grades.length, date]);

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
    summary += `📅 Date: ${formatDisplayDate(date)}\n`;
    summary += `━━━━━━━━━━━━━━━━━━\n\n`;

    gradeStats.forEach(stat => {
      summary += `🏷️ GRADE ${stat.grade}\n`;
      summary += `   Bags: ${stat.totalBags}\n`;
      summary += `   Gross Weight: ${stat.grossWeight} kg\n`;
      summary += `   Net Weight: ${stat.netWeight} kg\n`;
      const gradeRate = getBuyerRate(buyerId, stat.grade, date);
      if (gradeRate != null) {
        const gradeAmt = calculateAmount(gradeRate, stat.netWeight, stat.totalBags);
        summary += `   Rate: ${gradeRate}\n`;
        summary += `   Amount: ₹${gradeAmt.toLocaleString('en-IN')}\n`;
      }
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
  const currentRate = getBuyerRate(buyerId, grade, date);
  const currentAmount = (stats && currentRate) ? calculateAmount(currentRate, stats.netWeight, stats.totalBags) : undefined;

  // Inventory check for this grade
  const inventory = getInventory(date);
  const gradeInventory = inventory.find(inv => inv.grade === grade);
  const pendingBags = gradeInventory?.pendingBags ?? 0;
  const isOutOfStock = pendingBags <= 0;

  const handleBuyerPDF = async () => {
    if (!buyer || !stats) {
      alert('No bags entered yet');
      return;
    }
    const rate = getBuyerRate(buyerId, grade, date);
    const amount = rate ? calculateAmount(rate, stats.netWeight, stats.totalBags) : undefined;
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
        rate,
        amount,
      }],
    };
    const doc = generateBuyerSummaryPDF(pdfData);
    await sharePDF(doc, `${buyer.name}-Grade${grade}-${date}`);
  };

  const handlePrint = () => {
    if (!buyer || !stats) {
      alert('No bags entered yet');
      return;
    }
    const rate2 = getBuyerRate(buyerId, grade, date);
    const amount2 = rate2 ? calculateAmount(rate2, stats.netWeight, stats.totalBags) : undefined;
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
        rate: rate2,
        amount: amount2,
      }],
    };
    const doc = generateBuyerSummaryPDF(pdfData, true);
    window.open(doc.output('bloburl') as unknown as string, '_blank');
  };

  const handleImageReport = async () => {
    if (!buyer || !stats) {
      alert('No bags entered yet');
      return;
    }
    const rate3 = getBuyerRate(buyerId, grade, date);
    const amount3 = rate3 ? calculateAmount(rate3, stats.netWeight, stats.totalBags) : undefined;
    const imageData: BuyerSummaryData = {
      buyer,
      date,
      grades: [{
        grade,
        color: gradeColor,
        bags,
        totalBags: stats.totalBags,
        grossWeight: stats.grossWeight,
        netWeight: stats.netWeight,
        rate: rate3,
        amount: amount3,
      }],
    };
    try {
      const blob = await generateBuyerReportImage(imageData);
      await shareReportImage(blob, `${buyer.name}-Grade${grade}-${date}`);
    } catch (err) {
      console.error('Error generating image report:', err);
      alert('Failed to generate image report. Please try again.');
    }
  };

  const WEIGHT_OPTIONS = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65];
  const [customWeight, setCustomWeight] = useState('');

  const WEIGHT_COLOR_MAP: Record<number, string> = {
    50: '#ef4444', // Red
    51: '#f97316', // Orange
    52: '#f59e0b', // Amber
    53: '#eab308', // Yellow
    54: '#84cc16', // Lime
    55: '#22c55e', // Green
    56: '#10b981', // Emerald
    57: '#14b8a6', // Teal
    58: '#06b6d4', // Cyan
    59: '#0ea5e9', // Sky
    60: '#3b82f6', // Blue
    61: '#6366f1', // Indigo
    62: '#8b5cf6', // Violet
    63: '#a855f7', // Purple
    64: '#d946ef', // Fuchsia
    65: '#ec4899', // Pink
  };

  const getWeightColor = (weight: number) => {
    return WEIGHT_COLOR_MAP[weight] || '#6b7280'; // Gray fallback
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

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-sm">
          <div className="text-5xl mb-4">&#9888;&#65039;</div>
          <p className="text-lg font-semibold text-red-600 mb-2">{fetchError}</p>
          <button
            onClick={loadData}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition shadow-md"
          >
            Retry
          </button>
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateBuyerSummary}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                Share
              </button>
              <button
                onClick={handleImageReport}
                className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                Image
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-lg hover:from-gray-600 hover:to-gray-700 transition transform hover:scale-105 shadow-md text-xs"
              >
                Print
              </button>
              <button
                onClick={() => router.push(`/dashboard/${date}`)}
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                &larr; Back
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Status Bar */}
        <div className={`rounded-lg shadow-md p-4 mb-4 ${isOutOfStock ? 'bg-red-50 border-2 border-red-300' : 'bg-green-50 border-2 border-green-300'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{isOutOfStock ? '🚫' : '📦'}</span>
              <span className={`font-bold text-sm ${isOutOfStock ? 'text-red-700' : 'text-green-700'}`}>
                {isOutOfStock ? 'Out of Stock' : `Stock: ${pendingBags} bag${pendingBags !== 1 ? 's' : ''} remaining`}
              </span>
            </div>
            {gradeInventory && (
              <span className="text-xs text-gray-600">
                {gradeInventory.soldBags}/{gradeInventory.totalBagsStart} sold
              </span>
            )}
          </div>
        </div>

        {/* Quick Weight Entry */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-base font-bold mb-3 text-gray-800 flex items-center gap-2">
            <span className="text-lg">⚖️</span>
            QUICK WEIGHT ENTRY
          </h2>
          {isOutOfStock && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-sm font-semibold text-red-600">No inventory available - cannot add bags</p>
            </div>
          )}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 md:gap-2">
            {WEIGHT_OPTIONS.map(weight => (
              <button
                key={weight}
                disabled={submitting || isOutOfStock || !isOnline}
                onClick={async () => {
                  setSubmitting(true);
                  try {
                    await addBagWeight(buyerId, grade, weight, date);
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Failed to add bag. Please try again.');
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className={`aspect-square font-bold text-base md:text-lg rounded-lg transform transition-all shadow-md disabled:opacity-50 disabled:transform-none ${
                  isOutOfStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-white hover:scale-110 active:scale-95 hover:shadow-lg'
                }`}
                style={!isOutOfStock ? { backgroundColor: WEIGHT_COLOR_MAP[weight] } : undefined}
              >
                {weight}
              </button>
            ))}
          </div>

          {/* Custom Weight Input */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={customWeight}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) {
                  setCustomWeight(v);
                }
              }}
              placeholder="Custom wt (kg)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-base font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={submitting || isOutOfStock || !isOnline}
            />
            <button
              disabled={submitting || isOutOfStock || !isOnline || !customWeight}
              onClick={async () => {
                const val = parseFloat(customWeight);
                if (isNaN(val) || val <= 0) {
                  alert('Enter a valid weight');
                  return;
                }
                setSubmitting(true);
                try {
                  await addBagWeight(buyerId, grade, val, date);
                  setCustomWeight('');
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Failed to add bag. Please try again.');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition transform hover:scale-105 shadow-md disabled:opacity-50 disabled:transform-none text-sm"
            >
              + Add
            </button>
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
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs shadow-md hover:bg-red-600"
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

            {/* Rate & Amount */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-300">
                <div className="text-xs font-semibold text-amber-700 mb-2">Rate (per kg)</div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={currentRate ?? ''}
                  onBlur={async (e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val >= 0) {
                      try {
                        await setBuyerRate(buyerId, grade, date, val);
                      } catch {
                        // silently ignore if table doesn't exist yet
                      }
                    }
                  }}
                  placeholder="Enter rate"
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg text-2xl font-bold text-amber-900 text-center bg-white placeholder:text-amber-300 outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-300">
                <div className="text-xs font-semibold text-green-700 mb-2">Amount</div>
                <div className="text-3xl font-extrabold text-green-900 text-center mt-1">
                  {currentAmount != null ? `₹${currentAmount.toLocaleString('en-IN')}` : '—'}
                </div>
                {currentRate != null && (
                  <div className="text-xs text-green-600 text-center mt-1">
                    ({currentRate}×{stats.netWeight})×1.01 + 10×{stats.totalBags}
                  </div>
                )}
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
