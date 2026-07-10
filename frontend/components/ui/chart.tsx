'use client';

import React, { useState } from 'react';

// Common Tooltip Component
interface TooltipProps {
  active: boolean;
  content: React.ReactNode;
  x: number;
  y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ active, content, x, y }) => {
  if (!active) return null;
  return (
    <div
      className="absolute z-50 pointer-events-none rounded-lg border border-white/10 bg-black/80 p-2 text-xs text-white shadow-xl backdrop-blur-md transition-all duration-150"
      style={{ left: `${x + 10}px`, top: `${y - 40}px` }}
    >
      {content}
    </div>
  );
};

// 1. BAR CHART
interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = 'from-violet-500 to-indigo-500',
  height = 200,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 40; // reserve space for labels

  return (
    <div className="relative w-full" style={{ height: `${height}px` }}>
      <div className="flex h-full items-end gap-3 px-4">
        {data.map((item, index) => {
          const pct = (item.value / maxVal) * 100;
          const barHeight = Math.max((pct / 100) * chartHeight, 6);

          return (
            <div
              key={index}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parentRect = e.currentTarget.parentElement?.getBoundingClientRect();
                if (parentRect) {
                  setTooltipPos({
                    x: rect.left - parentRect.left + rect.width / 2,
                    y: rect.top - parentRect.top,
                  });
                }
                setHoveredIndex(index);
              }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* The visual bar with gradient and transition */}
              <div
                className={`w-full rounded-t-lg bg-gradient-to-t ${color} transition-all duration-300 group-hover:scale-x-105 group-hover:opacity-90 shadow-lg shadow-indigo-500/10`}
                style={{ height: `${barHeight}px` }}
              />

              {/* X Axis Label */}
              <span className="mt-2 block w-full truncate text-center text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      <Tooltip
        active={hoveredIndex !== null}
        x={tooltipPos.x}
        y={tooltipPos.y}
        content={
          hoveredIndex !== null ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-zinc-300">{data[hoveredIndex].label}</span>
              <span className="text-sm font-bold text-white">{data[hoveredIndex].value} Leads</span>
            </div>
          ) : null
        }
      />
    </div>
  );
};

// 2. DONUT CHART
interface DonutChartProps {
  data: Array<{ label: string; value: number; colorClass: string }>;
  height?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, height = 200 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const size = height - 40;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let currentOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
      {/* SVG Donut Circle */}
      <div 
        className="relative"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            className="text-zinc-100 dark:text-zinc-800"
            strokeWidth="12"
          />

          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-700 stroke-dasharray-4"
              strokeWidth="12"
            />
          ) : (
            data.map((item, index) => {
              const fraction = item.value / total;
              const strokeLength = fraction * circumference;
              const strokeOffset = circumference - strokeLength + currentOffset;
              currentOffset -= strokeLength;

              // Extract raw color representing color class
              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={
                    item.colorClass.includes('emerald')
                      ? '#10b981'
                      : item.colorClass.includes('amber')
                      ? '#f59e0b'
                      : item.colorClass.includes('rose')
                      ? '#f43f5e'
                      : item.colorClass.includes('indigo')
                      ? '#6366f1'
                      : item.colorClass.includes('cyan')
                      ? '#06b6d4'
                      : '#a855f7'
                  }
                  strokeWidth={isHovered ? 16 : 12}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const parentRect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                    if (parentRect) {
                      setTooltipPos({
                        x: rect.left - parentRect.left + rect.width / 2,
                        y: rect.top - parentRect.top + rect.height / 2,
                      });
                    }
                    setHoveredIndex(index);
                  }}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })
          )}
        </svg>

        {/* Text overlay in the middle of donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Total Leads</span>
        </div>
      </div>

      {/* Legend Column */}
      <div className="flex flex-col gap-2.5">
        {data.map((item, index) => {
          const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div
              key={index}
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-all duration-200 ${
                hoveredIndex === index ? 'bg-zinc-100 dark:bg-zinc-800/50' : ''
              }`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`h-2.5 w-2.5 rounded-full ${item.colorClass}`} />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {item.label}
                </span>
                <span className="text-[10px] font-medium text-zinc-400">
                  {item.value} leads ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <Tooltip
        active={hoveredIndex !== null}
        x={tooltipPos.x}
        y={tooltipPos.y}
        content={
          hoveredIndex !== null ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-zinc-300">{data[hoveredIndex].label}</span>
              <span className="text-sm font-bold text-white">
                {data[hoveredIndex].value} Leads ({total > 0 ? Math.round((data[hoveredIndex].value / total) * 100) : 0}%)
              </span>
            </div>
          ) : null
        }
      />
    </div>
  );
};

// 3. LINE TREND CHART
interface LineChartProps {
  data: Array<{ date: string; imported: number; failed: number }>;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, height = 200 }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-zinc-400" style={{ height: `${height}px` }}>
        No historical data available
      </div>
    );
  }

  const padding = 30;
  const chartWidth = 500;
  const chartHeight = height - 40;

  const maxVal = Math.max(...data.flatMap((d) => [d.imported, d.failed]), 1);

  // Compute SVG Points
  const pointsImported = data.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2)) / Math.max(data.length - 1, 1);
    const y = chartHeight - (d.imported / maxVal) * (chartHeight - padding);
    return { x, y, val: d.imported, date: d.date, failed: d.failed };
  });

  const pointsFailed = data.map((d, i) => {
    const x = padding + (i * (chartWidth - padding * 2)) / Math.max(data.length - 1, 1);
    const y = chartHeight - (d.failed / maxVal) * (chartHeight - padding);
    return { x, y, val: d.failed };
  });

  const getPathD = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return '';
    return points.reduce(
      (path, pt, index) => (index === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`),
      ''
    );
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${height}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = chartHeight - ratio * (chartHeight - padding);
          return (
            <line
              key={index}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke="currentColor"
              className="text-zinc-100 dark:text-zinc-800"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Paths */}
        <path
          d={getPathD(pointsImported)}
          fill="transparent"
          stroke="#10b981"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={getPathD(pointsFailed)}
          fill="transparent"
          stroke="#f43f5e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />

        {/* Hover detection nodes */}
        {pointsImported.map((pt, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <g key={index}>
              {/* Interaction vertical bar */}
              <rect
                x={pt.x - 20}
                y={0}
                width={40}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const parentRect = e.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                  if (parentRect) {
                    setTooltipPos({
                      x: rect.left - parentRect.left + rect.width / 2,
                      y: pt.y - 10,
                    });
                  }
                  setHoveredIndex(index);
                }}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Imported dot */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : 4}
                fill="#10b981"
                className="transition-all duration-150 pointer-events-none"
              />

              {/* Failed dot */}
              <circle
                cx={pointsFailed[index].x}
                cy={pointsFailed[index].y}
                r={isHovered ? 5 : 3.5}
                fill="#f43f5e"
                className="transition-all duration-150 pointer-events-none"
              />

              {/* Text labels along X Axis */}
              {index % 2 === 0 && (
                <text
                  x={pt.x}
                  y={height - 5}
                  textAnchor="middle"
                  fill="currentColor"
                  className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 fill-zinc-400 dark:fill-zinc-500"
                >
                  {pt.date.split('-').slice(1).join('/')}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <Tooltip
        active={hoveredIndex !== null}
        x={tooltipPos.x}
        y={tooltipPos.y}
        content={
          hoveredIndex !== null ? (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-zinc-300">Date: {pointsImported[hoveredIndex].date}</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-bold">{pointsImported[hoveredIndex].val} Imported</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-400">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <span className="font-bold">{pointsImported[hoveredIndex].failed} Failed/Skipped</span>
              </div>
            </div>
          ) : null
        }
      />
    </div>
  );
};
