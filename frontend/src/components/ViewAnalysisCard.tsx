import { useEffect, useRef, useState } from 'react';
import { Chart, BarController, PieController, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, LineController, Tooltip, Legend } from 'chart.js';
import { attendanceAPI } from '../services/api';
import type { AttendanceStats } from '../services/api';

Chart.register(BarController, PieController, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, LineController, Tooltip, Legend);

export default function ViewAnalysisCard({ onClose }: { onClose?: () => void }) {
  const barRef = useRef<HTMLCanvasElement | null>(null);
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let barChart: Chart | null = null;
    let pieChart: Chart | null = null;
    let lineChart: Chart | null = null;

    async function loadAndRender() {
      setLoading(true);
      setError(null);
      try {
        // fetch attendance statistics (backend returns per-student stats)
        const stats: AttendanceStats[] = await attendanceAPI.getAttendanceStats();

        // group by department (prefer deptName, then dept) and compute average attendancePercentage
        const grouped: Record<string, { total: number; count: number }> = {};
        for (const s of stats) {
          const dept = (s as any).deptName || (s as any).dept || (s as any).department || 'Unknown';
          if (!grouped[dept]) grouped[dept] = { total: 0, count: 0 };
          grouped[dept].total += (s.attendancePercentage || 0);
          grouped[dept].count += 1;
        }

        const labels = Object.keys(grouped);
        if (!labels.length) {
          setError('No attendance statistics available to render charts');
          return;
        }

        const dataValues = labels.map(l => Math.round((grouped[l].total / grouped[l].count) * 100) / 100);

        const commonOptions = {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'bottom' as const }
          }
        };

        if (barRef.current) {
          barChart = new Chart(barRef.current, {
            type: 'bar',
            data: {
              labels,
              datasets: [
                {
                  label: 'Avg Attendance %',
                  data: dataValues,
                  backgroundColor: 'rgba(34,197,94,0.7)'
                }
              ]
            },
            options: commonOptions
          });
        }

        if (pieRef.current) {
          pieChart = new Chart(pieRef.current, {
            type: 'pie',
            data: {
              labels,
              datasets: [
                {
                  label: 'Avg Attendance %',
                  data: dataValues,
                  backgroundColor: labels.map((_, i) => `hsl(${(i / labels.length) * 360} 70% 50% / 0.8)`)
                }
              ]
            },
            options: commonOptions
          });
        }

        if (lineRef.current) {
          lineChart = new Chart(lineRef.current, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Avg Attendance %',
                  data: dataValues,
                  borderColor: 'rgba(16,185,129,0.9)',
                  backgroundColor: 'rgba(16,185,129,0.2)',
                  fill: true,
                  tension: 0.2,
                  pointRadius: 4
                }
              ]
            },
            options: commonOptions
          });
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load attendance data');
      } finally {
        setLoading(false);
      }
    }

    loadAndRender();

    return () => {
      barChart?.destroy();
      pieChart?.destroy();
      lineChart?.destroy();
    };
  }, []);

  return (
    <div className="relative group overflow-hidden text-left bg-white rounded-xl shadow-xl border border-supergreenDark/30 hover:shadow-2xl hover:border-supergreenAccent transition p-6 h-full">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close analysis"
          className="absolute right-3 top-3 text-supergreenDark/70 hover:text-red-600"
        >
          ✕
        </button>
      )}
      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-supercream text-supergreen flex items-center justify-center font-bold">AN</div>
        <div>
          <h3 className="text-lg font-bold text-supergreenDark">View Analysis</h3>
          <p className="text-sm text-supergreen/80 mt-1">Compare attendance percentages between branches</p>
        </div>
      </div>

      <div className="mt-4 text-xs text-supergreenDark/60 leading-relaxed">
        {loading && <div>Loading charts…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3" style={{height: 280}}>
            <div className="bg-white p-2 rounded">
              <div className="text-sm font-medium mb-1">Bar Graph</div>
              <div className="h-56">
                <canvas ref={barRef} />
              </div>
            </div>

            <div className="bg-white p-2 rounded">
              <div className="text-sm font-medium mb-1">Pie Chart</div>
              <div className="h-56">
                <canvas ref={pieRef} />
              </div>
            </div>

            <div className="bg-white p-2 rounded">
              <div className="text-sm font-medium mb-1">Line Graph</div>
              <div className="h-56">
                <canvas ref={lineRef} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
