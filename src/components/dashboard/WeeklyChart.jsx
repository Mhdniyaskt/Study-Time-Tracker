import React, { useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import { useTheme } from '../../hooks/useTheme';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function WeeklyChart({ labels = [], data = [], weeklyDayTotals = [] }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const { isDark } = useTheme();

  // If weeklyDayTotals is not passed from backend, synthesize it from labels and data
  const dayNames = labels.length > 0 ? labels : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTotals = weeklyDayTotals.length > 0
    ? weeklyDayTotals
    : dayNames.map((name, i) => {
        const val = data[i] || 0;
        const totalMinutes = Math.round(val * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        const formatted = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
        return {
          dayName: name,
          hours: val,
          totalMinutes,
          formattedTime: formatted,
          isToday: false,
        };
      });

  const maxHours = Math.max(1, ...dayTotals.map(d => d.hours || 0));

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    const ctx = canvasRef.current.getContext('2d');
    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dayNames,
        datasets: [{
          label: 'Study Hours',
          data: data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(99, 102, 241, 0.85)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 45,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} hours`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback: (val) => `${val}h`,
            },
            grid: { color: gridColor },
          },
          x: {
            ticks: { color: textColor },
            grid: { display: false },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [dayNames, data, isDark]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Weekly Study Activity
        </h2>
        <span className="text-xs text-gray-400">Current Week</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Bar Chart */}
        <div className="lg:col-span-2 h-64 sm:h-72">
          <canvas ref={canvasRef} />
        </div>

        {/* Right Column (1 col): Horizontal Day Bars */}
        <div className="flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-700/80 pt-4 lg:pt-0 lg:pl-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
            Daily Breakdown
          </h3>

          <div className="space-y-2.5">
            {dayTotals.map((item, idx) => {
              const barWidth = maxHours > 0 ? Math.min(100, Math.round(((item.hours || 0) / maxHours) * 100)) : 0;
              const hasTime = (item.totalMinutes || 0) > 0;

              return (
                <div key={idx} className="flex items-center gap-2.5 text-xs">
                  <span
                    className={`w-8 font-mono font-bold shrink-0 ${
                      item.isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {item.dayName.toUpperCase()}
                  </span>

                  <div className="flex-1 bg-gray-100 dark:bg-gray-700/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        item.isToday
                          ? 'bg-indigo-600 dark:bg-indigo-400'
                          : hasTime
                            ? 'bg-indigo-400 dark:bg-indigo-500'
                            : 'bg-transparent'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <span
                    className={`w-14 text-right font-mono shrink-0 font-medium ${
                      hasTime
                        ? 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {item.formattedTime || '0m'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
