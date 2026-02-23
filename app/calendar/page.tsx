'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { isDateAllowed, isFutureDate, formatDate } from '@/lib/calculations';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { datesWithData, fetchDatesWithData, logout } = useStore();

  useEffect(() => {
    fetchDatesWithData().finally(() => setLoading(false));
  }, [fetchDatesWithData]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = monthStart.getDay();
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const handleDateClick = (date: Date) => {
    if (!isDateAllowed(date)) return;
    if (isFutureDate(date)) return;

    const dateStr = formatDate(date);
    router.push(`/dashboard/${dateStr}`);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(currentMonth, 1);
    const today = new Date();
    if (nextMonth <= today) {
      setCurrentMonth(nextMonth);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-3 md:p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Select Date
              </h1>
              <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">Choose a date to view trading records</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 text-sm text-gray-600 hover:text-gray-900 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-lg p-3 md:p-8">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4 md:mb-8">
            <button
              onClick={goToPreviousMonth}
              className="p-2 md:p-3 hover:bg-gray-100 rounded-xl transition flex items-center gap-1 md:gap-2 font-semibold text-gray-700 text-sm md:text-base"
            >
              <span className="text-lg md:text-xl">&larr;</span> <span className="hidden sm:inline">Previous</span>
            </button>
            <h2 className="text-lg md:text-2xl font-bold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h2>
            <button
              onClick={goToNextMonth}
              className="p-2 md:p-3 hover:bg-gray-100 rounded-xl transition flex items-center gap-1 md:gap-2 font-semibold text-gray-700 text-sm md:text-base"
            >
              <span className="hidden sm:inline">Next</span> <span className="text-lg md:text-xl">&rarr;</span>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="text-4xl mb-4 animate-pulse">Loading...</div>
            </div>
          ) : (
            <>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                  const fullDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i];
                  return (
                  <div key={fullDay} className="text-center text-xs md:text-sm font-bold text-gray-600 py-2 md:py-3 uppercase tracking-wide">
                    <span className="sm:hidden">{day}</span>
                    <span className="hidden sm:inline">{fullDay}</span>
                  </div>
                  );
                })}

                {/* Padding days */}
                {paddingDays.map((_, index) => (
                  <div key={`padding-${index}`} className="aspect-square"></div>
                ))}

                {/* Calendar days */}
                {daysInMonth.map(date => {
                  const dateStr = formatDate(date);
                  const hasData = datesWithData.has(dateStr);
                  const isAllowed = isDateAllowed(date);
                  const isFuture = isFutureDate(date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDateClick(date)}
                      disabled={!isAllowed || isFuture}
                      className={`
                        aspect-square p-1 md:p-3 rounded-lg md:rounded-xl transition-all relative font-semibold text-sm md:text-lg
                        ${isToday ? 'ring-2 md:ring-4 ring-indigo-500 ring-offset-1 md:ring-offset-2' : ''}
                        ${hasData ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg hover:shadow-xl' : 'bg-gray-50'}
                        ${isFuture ? 'opacity-20 cursor-not-allowed' : ''}
                        ${isAllowed && !isFuture && !hasData ? 'hover:bg-indigo-50 cursor-pointer border md:border-2 border-gray-200' : ''}
                        ${!isAllowed && !isFuture ? 'opacity-10 cursor-not-allowed' : ''}
                        ${hasData ? 'transform hover:scale-105' : ''}
                      `}
                    >
                      <span className={hasData ? 'text-white' : 'text-gray-700'}>
                        {format(date, 'd')}
                      </span>
                      {hasData && (
                        <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full shadow"></div>
                        </div>
                      )}
                      {isToday && !hasData && (
                        <div className="absolute bottom-0 md:bottom-1 left-1/2 transform -translate-x-1/2">
                          <div className="text-[8px] md:text-xs text-indigo-600 font-bold">Today</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 md:mt-8 flex flex-wrap gap-3 md:gap-6 text-xs md:text-sm justify-center">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-6 h-6 md:w-10 md:h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-md md:rounded-lg shadow"></div>
                  <span className="font-medium">Has Data</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-6 h-6 md:w-10 md:h-10 bg-gray-50 border md:border-2 border-gray-200 rounded-md md:rounded-lg"></div>
                  <span className="font-medium">No Data</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="w-6 h-6 md:w-10 md:h-10 bg-gray-50 opacity-20 rounded-md md:rounded-lg"></div>
                  <span className="font-medium">Locked</span>
                </div>
              </div>

              <div className="mt-4 md:mt-6 p-3 md:p-4 bg-blue-50 border md:border-2 border-blue-200 rounded-xl text-center">
                <p className="text-xs md:text-sm text-blue-800 font-medium">
                  You can view data from the past 3 months. Future dates are locked.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
