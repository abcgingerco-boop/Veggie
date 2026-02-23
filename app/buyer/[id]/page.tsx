'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { calculateGradeWiseStats } from '@/lib/calculations';
import { generateBuyerSummaryPDF, sharePDF } from '@/lib/pdf';
import type { BuyerSummaryData } from '@/lib/types';

export default function BuyerOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: buyerId } = use(params);
  const searchParams = useSearchParams();
  const date = searchParams.get('date') || '';
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { buyers, bagWeights, grades, vehicles, fetchBuyers, fetchBagWeightsForDate, fetchGrades, fetchVehiclesForDate } = useStore();

  // Fallback fetch if store is empty (e.g., direct URL navigation)
  useEffect(() => {
    const needsFetch = buyers.length === 0 || grades.length === 0;
    if (needsFetch && date) {
      setLoading(true);
      Promise.all([
        fetchBuyers(),
        fetchGrades(),
        fetchBagWeightsForDate(date),
        fetchVehiclesForDate(date),
      ]).finally(() => setLoading(false));
    }
  }, [buyers.length, grades.length, date, fetchBuyers, fetchGrades, fetchBagWeightsForDate, fetchVehiclesForDate]);

  const buyer = buyers.find(b => b.id === buyerId);

  const allBuyerBags = bagWeights.filter(
    b => b.buyerId === buyerId && b.date === date
  );

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
    const gradeInfo = grades.find(g => g.name === gradeName);
    return {
      grade: gradeName,
      color: gradeInfo?.color || '#6366f1',
      bags,
      ...stats
    };
  });

  const generateBuyerSummary = () => {
    if (gradeStats.length === 0) {
      alert('No bags entered yet for this buyer');
      return;
    }

    let summary = `BUYER SUMMARY\n`;
    summary += `==================\n`;
    summary += `Name: ${buyer?.name}\n`;
    if (buyer?.phone) summary += `Phone: ${buyer.phone}\n`;
    summary += `Date: ${date}\n`;
    summary += `==================\n\n`;

    gradeStats.forEach(stat => {
      summary += `GRADE ${stat.grade}\n`;
      summary += `   Bags: ${stat.totalBags}\n`;
      summary += `   Gross Weight: ${stat.grossWeight} kg\n`;
      summary += `   Net Weight: ${stat.netWeight} kg\n`;
      summary += `   Individual Bags:\n`;
      stat.bags.forEach((bag: any) => {
        summary += `      Bag #${bag.bagNumber}: ${bag.weight} kg\n`;
      });
      summary += `\n`;
    });

    summary += `==================\n`;
    summary += `Generated with Ginger Trading System`;

    if (navigator.share) {
      navigator.share({
        title: `${buyer?.name} - Buyer Summary`,
        text: summary
      }).catch(() => {
        navigator.clipboard.writeText(summary);
        alert('Summary copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(summary);
      alert('Summary copied to clipboard!');
    }
  };

  const handleBuyerPDF = async () => {
    if (!buyer || gradeStats.length === 0) {
      alert('No bags entered yet for this buyer');
      return;
    }
    const pdfData: BuyerSummaryData = {
      buyer,
      date,
      grades: gradeStats,
    };
    const doc = generateBuyerSummaryPDF(pdfData);
    await sharePDF(doc, `${buyer.name}-Summary-${date}`);
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
              {buyer.phone && (
                <div className="text-xs text-gray-600 mt-1">Tel: {buyer.phone}</div>
              )}
              <div className="text-xs text-gray-500 mt-0.5">{date}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={generateBuyerSummary}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                Share
              </button>
              <button
                onClick={handleBuyerPDF}
                className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                PDF
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

        {/* All Grades Overview */}
        {gradeStats.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-400">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-base font-semibold">No bags entered yet</p>
            <p className="text-xs mt-2">Click on a grade below to start adding bags</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gradeStats.map(gradeStat => (
              <div
                key={gradeStat.grade}
                className="bg-white rounded-lg shadow-md p-4 border-2"
                style={{ borderColor: gradeStat.color }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                      style={{ backgroundColor: gradeStat.color }}
                    >
                      {gradeStat.grade}
                    </div>
                    <h2 className="text-lg font-bold" style={{ color: gradeStat.color }}>
                      GRADE {gradeStat.grade}
                    </h2>
                  </div>
                  <button
                    onClick={() => router.push(`/buyer/${buyerId}/${gradeStat.grade}?date=${date}`)}
                    className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition text-xs"
                  >
                    View Details &rarr;
                  </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-300">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Total Bags</div>
                    <div className="text-2xl font-extrabold text-blue-900">{gradeStat.totalBags}</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center border border-purple-300">
                    <div className="text-xs font-semibold text-purple-700 mb-1">Gross Weight</div>
                    <div className="text-2xl font-extrabold text-purple-900">{gradeStat.grossWeight}</div>
                    <div className="text-xs font-semibold text-purple-700">kg</div>
                  </div>

                  <div
                    className="rounded-lg p-3 text-center border-2 shadow-sm"
                    style={{
                      backgroundColor: `${gradeStat.color}15`,
                      borderColor: gradeStat.color
                    }}
                  >
                    <div className="text-xs font-bold mb-1" style={{ color: gradeStat.color }}>
                      NET WEIGHT
                    </div>
                    <div className="text-2xl font-black" style={{ color: gradeStat.color }}>
                      {gradeStat.netWeight}
                    </div>
                    <div className="text-xs font-bold" style={{ color: gradeStat.color }}>kg</div>
                  </div>
                </div>

                {/* Bag List */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Bags ({gradeStat.totalBags})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {gradeStat.bags.map((bag: any) => (
                      <div
                        key={bag.id}
                        className="px-2 py-1 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: gradeStat.color }}
                      >
                        #{bag.bagNumber}: {bag.weight}kg
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Access to Add Bags for Each Grade */}
        <div className="bg-white rounded-lg shadow-md p-4 mt-4">
          <h3 className="text-base font-bold text-gray-800 mb-3">Add Bags by Grade</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {grades.filter(g => g.isActive).map(grade => {
              const hasBags = gradeStats.some(gs => gs.grade === grade.name);
              const inv = useStore.getState().getInventory(date);
              const gradeInv = inv.find(i => i.grade === grade.name);
              const noStock = !gradeInv || gradeInv.pendingBags <= 0;
              return (
                <button
                  key={grade.id}
                  onClick={() => router.push(`/buyer/${buyerId}/${grade.name}?date=${date}`)}
                  className={`p-3 rounded-lg text-left hover:scale-105 transition-all transform shadow-sm hover:shadow-md border ${noStock && !hasBags ? 'opacity-60' : ''}`}
                  style={{
                    backgroundColor: noStock && !hasBags ? '#f3f4f6' : `${grade.color}10`,
                    borderColor: noStock && !hasBags ? '#d1d5db' : `${grade.color}40`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm" style={{ color: noStock && !hasBags ? '#9ca3af' : grade.color }}>
                      Grade {grade.name}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: noStock && !hasBags ? '#9ca3af' : grade.color }}
                    >
                      {grade.name}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-600">
                      {hasBags ? 'View/Add more' : 'Click to add'}
                    </span>
                    {noStock && (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">No Stock</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
