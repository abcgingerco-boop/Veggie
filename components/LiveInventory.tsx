'use client';

import { useStore } from '@/lib/store';

interface LiveInventoryProps {
  date: string;
}

export function LiveInventory({ date }: LiveInventoryProps) {
  // Subscribe to vehicles, bagWeights, and grades so the component re-renders when they change
  const vehicles = useStore(state => state.vehicles);
  const bagWeights = useStore(state => state.bagWeights);
  const grades = useStore(state => state.grades);
  const getInventory = useStore(state => state.getInventory);
  const inventory = getInventory(date);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-base font-bold mb-4 text-gray-800 flex items-center gap-2">
        <span className="text-lg">📊</span>
        LIVE INVENTORY - GRADE WISE
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {inventory.map((inv) => (
          <div
            key={inv.grade}
            className="rounded-lg p-4 border-2 transition-all hover:shadow-md"
            style={{ borderColor: inv.color, backgroundColor: `${inv.color}08` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold" style={{ color: inv.color }}>
                Grade {inv.grade}
              </span>
              <div
                className="px-2.5 py-1 rounded-full flex items-center justify-center text-white font-bold text-xs whitespace-nowrap"
                style={{ backgroundColor: inv.color, minWidth: '32px' }}
              >
                {inv.grade}
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-white rounded-lg p-2 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Total at Start:</span>
                  <span className="font-bold text-lg text-gray-900">{inv.totalBagsStart}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-2 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600">Sold:</span>
                  <span className="font-bold text-base text-red-600">{inv.soldBags}</span>
                </div>
              </div>

              <div
                className="bg-white rounded-lg p-2.5 shadow-sm border"
                style={{ borderColor: inv.pendingBags === 0 && inv.soldBags > inv.totalBagsStart ? '#ef4444' : inv.color }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-700">Pending:</span>
                  <span
                    className="font-bold text-xl"
                    style={{ color: inv.pendingBags === 0 && inv.soldBags > inv.totalBagsStart ? '#ef4444' : inv.color }}
                  >
                    {inv.pendingBags}
                  </span>
                </div>
                {inv.soldBags > inv.totalBagsStart && (
                  <div className="text-xs font-semibold text-red-500 mt-1">
                    Oversold by {inv.soldBags - inv.totalBagsStart}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {inventory.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📦</div>
          <p className="text-lg">No inventory data for this date</p>
        </div>
      )}
    </div>
  );
}
