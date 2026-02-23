'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LiveInventory } from '@/components/LiveInventory';
import { AddVehicleModal } from '@/components/AddVehicleModal';
import { AddBuyerModal } from '@/components/AddBuyerModal';
import { ManageGradesModal } from '@/components/ManageGradesModal';
import { formatDisplayDate, calculateGradeWiseStats } from '@/lib/calculations';
import { generateDailyReportPDF, sharePDF } from '@/lib/pdf';
import type { DailyReportData } from '@/lib/types';

export default function DashboardPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const router = useRouter();
  const { vehicles, buyers, bagWeights, grades, fetchVehiclesForDate, fetchBagWeightsForDate, fetchBuyers, fetchGrades } = useStore();

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showBuyerModal, setShowBuyerModal] = useState(false);
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [buyerSearch, setBuyerSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchVehiclesForDate(date),
      fetchBagWeightsForDate(date),
      fetchBuyers(),
      fetchGrades(),
    ]).finally(() => setLoading(false));
  }, [date, fetchVehiclesForDate, fetchBagWeightsForDate, fetchBuyers, fetchGrades]);

  const dateVehicles = vehicles.filter(v => v.date === date);

  const searchTerm = buyerSearch.toLowerCase().trim();
  const filteredBuyers = buyers.filter(b => {
    if (!b.isActive) return false;
    if (!searchTerm) return true;
    return b.name.toLowerCase().includes(searchTerm) ||
      (b.phone && b.phone.toLowerCase().includes(searchTerm));
  });

  const buyerData = filteredBuyers.map(buyer => {
    const buyerBags = bagWeights.filter(
      b => b.buyerId === buyer.id && b.date === date
    );

    const gradeGroups: Record<string, any[]> = {};
    buyerBags.forEach(bag => {
      if (!gradeGroups[bag.grade]) {
        gradeGroups[bag.grade] = [];
      }
      gradeGroups[bag.grade].push(bag);
    });

    return {
      buyer,
      hasPurchases: buyerBags.length > 0,
      grades: Object.entries(gradeGroups).map(([grade, bags]) => ({
        grade,
        bags,
        ...calculateGradeWiseStats(bags),
        color: grades.find(g => g.name === grade)?.color || '#6366f1'
      }))
    };
  });

  const generateDailyReport = () => {
    let report = `DAILY CONSOLIDATED REPORT\n`;
    report += `========================\n`;
    report += `Date: ${formatDisplayDate(date)}\n`;
    report += `========================\n\n`;

    report += `VEHICLES (${dateVehicles.length})\n`;
    report += `${'─'.repeat(30)}\n`;
    if (dateVehicles.length === 0) {
      report += `No vehicles added\n\n`;
    } else {
      dateVehicles.forEach(vehicle => {
        report += `\n${vehicle.vehicleNumber}\n`;
        Object.entries(vehicle.gradeWiseBags).forEach(([grade, count]) => {
          report += `   Grade ${grade}: ${count} bags\n`;
        });
      });
      report += `\n`;
    }

    report += `\nBUYERS SUMMARY\n`;
    report += `${'─'.repeat(30)}\n`;
    if (buyerData.length === 0) {
      report += `No buyers added\n\n`;
    } else {
      buyerData.forEach((data: any) => {
        report += `\n${data.buyer.name}`;
        if (data.buyer.phone) report += ` (${data.buyer.phone})`;
        report += `\n`;

        if (data.grades.length === 0) {
          report += `   No purchases yet\n`;
        } else {
          data.grades.forEach((gradeData: any) => {
            report += `   Grade ${gradeData.grade}:\n`;
            report += `      Bags: ${gradeData.totalBags}\n`;
            report += `      Gross: ${gradeData.grossWeight} kg\n`;
            report += `      Net: ${gradeData.netWeight} kg\n`;
            gradeData.bags.forEach((bag: any) => {
              report += `         Bag #${bag.bagNumber}: ${bag.weight} kg\n`;
            });
          });
        }
      });
      report += `\n`;
    }

    const inventory = useStore.getState().getInventory(date);
    report += `\nINVENTORY SUMMARY\n`;
    report += `${'─'.repeat(30)}\n`;
    inventory.forEach(inv => {
      report += `\nGrade ${inv.grade}:\n`;
      report += `   Total at Start: ${inv.totalBagsStart} bags\n`;
      report += `   Sold: ${inv.soldBags} bags\n`;
      report += `   Pending: ${inv.pendingBags} bags\n`;
    });

    report += `\n========================\n`;
    report += `Generated with Ginger Trading System`;

    if (navigator.share) {
      navigator.share({
        title: `Daily Report - ${date}`,
        text: report
      }).catch(() => {
        navigator.clipboard.writeText(report);
        alert('Report copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(report);
      alert('Report copied to clipboard!');
    }
  };

  const handlePDFReport = async () => {
    const inventory = useStore.getState().getInventory(date);
    const reportData: DailyReportData = {
      date,
      vehicles: dateVehicles,
      buyerSummaries: buyerData
        .filter((d: any) => d.grades.length > 0)
        .map((d: any) => ({
          buyer: d.buyer,
          grades: d.grades,
        })),
      inventory,
    };
    const doc = generateDailyReportPDF(reportData);
    await sharePDF(doc, `Daily-Report-${date}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
        <div className="max-w-7xl mx-auto p-3 md:p-6">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse">
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-pulse">
            <div className="h-60 bg-gray-200 rounded"></div>
          </div>
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
              <h1 className="text-xl font-bold text-gray-900">{formatDisplayDate(date)}</h1>
              <p className="text-sm text-gray-600 mt-0.5">Daily Trading Dashboard</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={generateDailyReport}
                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                Report
              </button>
              <button
                onClick={handlePDFReport}
                className="px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-pink-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                PDF
              </button>
              <button
                onClick={() => setShowGradesModal(true)}
                className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                Grades
              </button>
              <button
                onClick={() => router.push('/calendar')}
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                &larr; Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Live Inventory */}
        <LiveInventory date={date} />

        {/* Vehicles Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="text-lg">🚛</span>
              VEHICLES - GRADE WISE
            </h2>
            <button
              onClick={() => setShowVehicleModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition transform hover:scale-105 shadow-md text-xs"
            >
              + Add Vehicle
            </button>
          </div>

          {dateVehicles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🚛</div>
              <p className="text-lg">No vehicles added for this date</p>
              <p className="text-sm mt-2">Click &quot;Add Vehicle&quot; to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dateVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg p-4 border border-gray-300 hover:shadow-md transition shadow-sm"
                >
                  <div className="text-base font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    {vehicle.vehicleNumber}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(vehicle.gradeWiseBags).map(([grade, count]) => {
                      const gradeColor = grades.find(g => g.name === grade)?.color || '#6366f1';
                      return (
                        <div
                          key={grade}
                          className="flex items-center justify-between p-2.5 rounded-lg border"
                          style={{
                            backgroundColor: `${gradeColor}10`,
                            borderColor: `${gradeColor}40`
                          }}
                        >
                          <span className="font-semibold text-sm" style={{ color: gradeColor }}>
                            Grade {grade}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-lg text-gray-900">{count}</span>
                            <span className="font-medium text-xs text-gray-600">bags</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buyers Section - Grade Wise */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <span className="text-lg">👥</span>
                BUYERS - GRADE WISE
              </h2>
              <button
                onClick={() => setShowBuyerModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition transform hover:scale-105 shadow-md text-xs"
              >
                + Add Buyer
              </button>
            </div>
            <input
              type="text"
              value={buyerSearch}
              onChange={(e) => setBuyerSearch(e.target.value)}
              placeholder="Search buyers by name or phone..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none text-sm text-black placeholder:text-gray-400"
            />
          </div>

          {buyerData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-lg">No buyers added yet</p>
              <p className="text-sm mt-2">Click &quot;+ Add Buyer&quot; to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {buyerData.map((data: any) => (
                <div key={data.buyer.id} className="bg-white border border-gray-300 rounded-lg p-4 hover:shadow-md transition shadow-sm">
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-base font-bold text-gray-900">{data.buyer.name}</div>
                        {data.buyer.phone && (
                          <div className="text-xs text-gray-600 mt-0.5">Tel: {data.buyer.phone}</div>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/buyer/${data.buyer.id}?date=${date}`)}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-indigo-600 transition text-xs"
                      >
                        View Overview
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {grades.filter(g => g.isActive).map(grade => {
                      const gradeData = data.grades.find((g: any) => g.grade === grade.name);

                      if (gradeData) {
                        return (
                          <button
                            key={grade.id}
                            onClick={() => router.push(`/buyer/${data.buyer.id}/${grade.name}?date=${date}`)}
                            className="w-full p-2.5 rounded-lg text-left hover:scale-102 transition-all transform shadow-sm hover:shadow-md border"
                            style={{
                              backgroundColor: `${grade.color}08`,
                              borderColor: `${grade.color}40`
                            }}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-sm" style={{ color: grade.color }}>
                                Grade {grade.name}
                              </span>
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{ backgroundColor: grade.color }}
                              >
                                {grade.name}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs">
                              <div className="text-center bg-white bg-opacity-60 p-1 rounded">
                                <div className="text-gray-600">Bags</div>
                                <div className="font-bold text-gray-900">{gradeData.totalBags}</div>
                              </div>
                              <div className="text-center bg-white bg-opacity-60 p-1 rounded">
                                <div className="text-gray-600">Gross</div>
                                <div className="font-semibold text-gray-800">{gradeData.grossWeight}</div>
                              </div>
                              <div className="text-center p-1 rounded" style={{ backgroundColor: `${grade.color}15` }}>
                                <div className="text-gray-600">Net</div>
                                <div className="font-bold" style={{ color: grade.color }}>{gradeData.netWeight}</div>
                              </div>
                            </div>
                          </button>
                        );
                      } else {
                        return (
                          <button
                            key={grade.id}
                            onClick={() => router.push(`/buyer/${data.buyer.id}/${grade.name}?date=${date}`)}
                            className="w-full p-2.5 rounded-lg text-left hover:scale-102 transition-all transform shadow-sm hover:shadow-md border"
                            style={{
                              backgroundColor: `${grade.color}08`,
                              borderColor: `${grade.color}40`
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-sm" style={{ color: grade.color }}>
                                Grade {grade.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Click to add bags</span>
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ backgroundColor: grade.color }}
                                >
                                  {grade.name}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      }
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showVehicleModal && (
        <AddVehicleModal date={date} onClose={() => setShowVehicleModal(false)} />
      )}
      {showBuyerModal && (
        <AddBuyerModal onClose={() => setShowBuyerModal(false)} />
      )}
      {showGradesModal && (
        <ManageGradesModal onClose={() => setShowGradesModal(false)} />
      )}
    </div>
  );
}
