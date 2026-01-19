import { FC, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { HourlyPrices } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface PriceChartProps {
  data: HourlyPrices | null;
  currentHour: number;
}

type ViewMode = 'today' | 'tomorrow' | 'both';

const PriceChart: FC<PriceChartProps> = ({ data, currentHour }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  const chartData: ChartData<'bar'> = useMemo(() => {
    if (!data) {
      return { labels: [], datasets: [] };
    }

    const getColor = (level: string, isCurrentHour: boolean) => {
      if (isCurrentHour) return 'rgba(255, 200, 87, 1)';
      switch (level) {
        case 'low':
          return 'rgba(34, 197, 94, 0.85)';
        case 'high':
          return 'rgba(239, 68, 68, 0.85)';
        default:
          return 'rgba(245, 158, 11, 0.85)';
      }
    };

    const getBorderColor = (level: string, isCurrentHour: boolean) => {
      if (isCurrentHour) return 'rgba(255, 200, 87, 1)';
      switch (level) {
        case 'low':
          return 'rgba(34, 197, 94, 1)';
        case 'high':
          return 'rgba(239, 68, 68, 1)';
        default:
          return 'rgba(245, 158, 11, 1)';
      }
    };

    if (viewMode === 'today' || (viewMode === 'both' && data.hoursTomorrow.length === 0)) {
      const todayData = data.hoursToday;
      return {
        labels: todayData.map((h) => `${h.hour.toString().padStart(2, '0')}:00`),
        datasets: [
          {
            label: 'Today',
            data: todayData.map((h) => h.priceCZK / 1000),
            backgroundColor: todayData.map((h, i) => getColor(h.level, i === currentHour)),
            borderColor: todayData.map((h, i) => getBorderColor(h.level, i === currentHour)),
            borderWidth: todayData.map((_, i) => (i === currentHour ? 2 : 1)),
            borderRadius: 3,
            barPercentage: 0.85,
          },
        ],
      };
    }

    if (viewMode === 'tomorrow' && data.hoursTomorrow.length > 0) {
      const tomorrowData = data.hoursTomorrow;
      return {
        labels: tomorrowData.map((h) => `${h.hour.toString().padStart(2, '0')}:00`),
        datasets: [
          {
            label: 'Tomorrow',
            data: tomorrowData.map((h) => h.priceCZK / 1000),
            backgroundColor: tomorrowData.map((h) => getColor(h.level, false)),
            borderColor: tomorrowData.map((h) => getBorderColor(h.level, false)),
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.85,
          },
        ],
      };
    }

    // Both days
    const allHours = [...data.hoursToday, ...data.hoursTomorrow];
    const labels = [
      ...data.hoursToday.map((h) => `${h.hour.toString().padStart(2, '0')}:00`),
      ...data.hoursTomorrow.map((h) => `+${h.hour.toString().padStart(2, '0')}`),
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Price',
          data: allHours.map((h) => h.priceCZK / 1000),
          backgroundColor: allHours.map((h, i) => getColor(h.level, i === currentHour)),
          borderColor: allHours.map((h, i) => getBorderColor(h.level, i === currentHour)),
          borderWidth: allHours.map((_, i) => (i === currentHour ? 2 : 1)),
          borderRadius: 2,
          barPercentage: 0.9,
        },
      ],
    };
  }, [data, currentHour, viewMode]);

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(13, 17, 23, 0.95)',
        titleColor: '#ffc857',
        bodyColor: '#e5e5e5',
        borderColor: 'rgba(255, 200, 87, 0.3)',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: "'Overpass Mono', monospace",
          size: 11,
          weight: 'bold',
        },
        bodyFont: {
          family: "'Overpass Mono', monospace",
          size: 12,
        },
        callbacks: {
          title: (items) => {
            const label = items[0].label;
            return label.startsWith('+') ? `Tomorrow ${label.slice(1)}` : `Today ${label}`;
          },
          label: (context) => {
            const value = context.parsed.y ?? 0;
            return `${value.toFixed(2)} Kč/kWh`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 200, 87, 0.05)',
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(255, 200, 87, 0.6)',
          font: {
            family: "'Overpass Mono', monospace",
            size: 9,
          },
          maxRotation: 0,
          callback: function (_, index) {
            // Show every 3rd hour
            if (index % 3 === 0) {
              return this.getLabelForValue(index);
            }
            return '';
          },
        },
        border: {
          color: 'rgba(255, 200, 87, 0.2)',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 200, 87, 0.08)',
          lineWidth: 1,
        },
        ticks: {
          color: 'rgba(255, 200, 87, 0.6)',
          font: {
            family: "'Overpass Mono', monospace",
            size: 10,
          },
          callback: (value) => `${value}`,
        },
        border: {
          color: 'rgba(255, 200, 87, 0.2)',
        },
        title: {
          display: true,
          text: 'Kč/kWh',
          color: 'rgba(255, 200, 87, 0.5)',
          font: {
            family: "'Overpass Mono', monospace",
            size: 9,
          },
        },
      },
    },
    animation: {
      duration: 500,
      easing: 'easeOutQuart',
    },
  };

  const hasTomorrow = data?.hoursTomorrow && data.hoursTomorrow.length > 0;

  return (
    <div className="chart-container">
      <div className="chart-tabs">
        <button
          className={`chart-tab ${viewMode === 'today' ? 'active' : ''}`}
          onClick={() => setViewMode('today')}
        >
          TODAY
        </button>
        <button
          className={`chart-tab ${viewMode === 'tomorrow' ? 'active' : ''}`}
          onClick={() => setViewMode('tomorrow')}
          disabled={!hasTomorrow}
        >
          TOMORROW
          {!hasTomorrow && <span className="tab-badge">N/A</span>}
        </button>
        {hasTomorrow && (
          <button
            className={`chart-tab ${viewMode === 'both' ? 'active' : ''}`}
            onClick={() => setViewMode('both')}
          >
            48H
          </button>
        )}
      </div>

      <div className="chart-wrapper">
        {data ? (
          <Bar data={chartData} options={options} />
        ) : (
          <div className="chart-skeleton">
            <div className="skeleton-bars">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-bar"
                  style={{ height: `${30 + Math.random() * 50}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
