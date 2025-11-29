import { useEffect, useRef, useState } from 'react';
import { FiBarChart2, FiEye } from 'react-icons/fi';
import { Chart, BarController, PieController, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, LineController, Tooltip, Legend } from 'chart.js';
import { attendanceAPI, superAdminAPI, batchAPI, studentAPI, mappingAPI } from '../services/api';
import type { AttendanceStats } from '../services/api';

Chart.register(BarController, PieController, BarElement, CategoryScale, LinearScale, ArcElement, LineElement, PointElement, LineController, Tooltip, Legend);

export default function ViewAnalysisCard() {
  const barRef = useRef<HTMLCanvasElement | null>(null);
  const pieRef = useRef<HTMLCanvasElement | null>(null);
  const lineRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AttendanceStats[] | null>(null);
  // Always show all charts; removed single-chart selection
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  // avgAttendance removed — not shown in summary cards
  const [unassignedBatchesCount, setUnassignedBatchesCount] = useState<number | null>(null);
  const [adminsWithRoleCount, setAdminsWithRoleCount] = useState<number | null>(null);
  const [todaysPresentCount, setTodaysPresentCount] = useState<number | null>(null);

  useEffect(() => {
    // no local chart instances here — charts are created in the charts effect

    // helper to get today's date in IST (YYYY-MM-DD)
    function getTodayISTString(): string {
      try {
        const tz = 'Asia/Kolkata';
        const ist = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
        const y = ist.getFullYear();
        const m = String(ist.getMonth() + 1).padStart(2, '0');
        const d = String(ist.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } catch (e) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    async function loadAndRender() {
      setLoading(true);
      setError(null);
      try {
        // fetch attendance stats and some basic counts in parallel
        const today = getTodayISTString();
        const [fetchedStats, admins, batches, students, mapping] = await Promise.all([
          attendanceAPI.getAttendanceStats(),
          superAdminAPI.getAdmins().catch(() => []),
          batchAPI.getBatches().catch(() => []),
          studentAPI.getStudents().catch(() => []),
          mappingAPI.getAdminBatchMapping().catch(() => null),
        ]);

        setStats(fetchedStats || []);
        setAdminCount(Array.isArray(admins) ? admins.length : null);
        setBatchCount(Array.isArray(batches) ? batches.length : null);
        setStudentCount(Array.isArray(students) ? students.length : null);
        setUnassignedBatchesCount(mapping && Array.isArray((mapping as any).unassignedBatches) ? (mapping as any).unassignedBatches.length : null);
        // count admins with role 'ADMIN' (case-insensitive)
        setAdminsWithRoleCount(Array.isArray(admins) ? admins.filter((a: any) => String(a.role || '').toUpperCase() === 'ADMIN').length : null);

        // average attendance computation removed (not displayed)

        // fetch today's attendance and compute present count
        try {
          const attended = await attendanceAPI.getAttendanceByDate(today).catch(() => null);
          let present = 0;
          if (Array.isArray(attended)) {
            present = attended.filter((r: any) => String(r.status).toLowerCase() === 'present').length;
          } else if (attended && (attended as any).FN) {
            const fn = Array.isArray((attended as any).FN) ? (attended as any).FN : [];
            const an = Array.isArray((attended as any).AN) ? (attended as any).AN : [];
            present = [...fn, ...an].filter((r: any) => String(r.status).toLowerCase() === 'present').length;
          }
          setTodaysPresentCount(typeof present === 'number' ? present : null);
        } catch (e) {
          setTodaysPresentCount(null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load attendance data');
        setStats([]);
      } finally {
        setLoading(false);
      }
    }

    loadAndRender();

    // no chart cleanup here (charts are created/cleaned in the charts effect)
  }, []);

  // Recreate charts whenever `stats` changes. Always render all four charts (no per-chart selection).
  useEffect(() => {
    if (!stats || !stats.length) return;

    // prepare grouped data
    const grouped: Record<string, { total: number; count: number }> = {};
    for (const s of stats) {
      const dept = (s as any).deptName || (s as any).dept || (s as any).department || 'Unknown';
      if (!grouped[dept]) grouped[dept] = { total: 0, count: 0 };
      grouped[dept].total += (s.attendancePercentage || 0);
      grouped[dept].count += 1;
    }
    const labels = Object.keys(grouped);
    const dataValues = labels.map(l => Math.round((grouped[l].total / grouped[l].count) * 100) / 100);

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' as const }
      }
    };

    let barChart: Chart | null = null;
    let pieChart: Chart | null = null;
    let lineChart: Chart | null = null;
    let doughnutChart: Chart | null = null;

    // build bins
    const bins = { '<50': 0, '50-70': 0, '70-90': 0, '90-100': 0 };
    for (const s of stats) {
      const p = Number(s.attendancePercentage || 0);
      if (p < 50) bins['<50'] += 1;
      else if (p < 70) bins['50-70'] += 1;
      else if (p < 90) bins['70-90'] += 1;
      else bins['90-100'] += 1;
    }
    const binLabels = Object.keys(bins);
    const binValues = binLabels.map(l => bins[l as keyof typeof bins]);

    // Create charts if their canvas is mounted
    if (barRef.current) {
      barChart = new Chart(barRef.current, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Avg Attendance %', data: dataValues, backgroundColor: 'rgba(34,197,94,0.7)' }] },
        options: commonOptions
      });
    }

    if (pieRef.current) {
      pieChart = new Chart(pieRef.current, {
        type: 'pie',
        data: { labels, datasets: [{ label: 'Avg Attendance %', data: dataValues, backgroundColor: labels.map((_, i) => `hsl(${(i / labels.length) * 360} 70% 50% / 0.8)`) }] },
        options: commonOptions
      });
    }

    if (lineRef.current) {
      lineChart = new Chart(lineRef.current, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Avg Attendance %', data: dataValues, borderColor: 'rgba(16,185,129,0.9)', backgroundColor: 'rgba(16,185,129,0.2)', fill: true, tension: 0.2, pointRadius: 4 }] },
        options: commonOptions
      });
    }

    if (doughnutRef.current) {
      doughnutChart = new Chart(doughnutRef.current, {
        type: 'doughnut',
        data: { labels: binLabels, datasets: [{ label: 'Students', data: binValues, backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1'] }] },
        options: commonOptions
      });
    }

    return () => {
      barChart?.destroy();
      pieChart?.destroy();
      lineChart?.destroy();
      doughnutChart?.destroy();
    };
  }, [stats]);

  // removed selection/fade effect — always showing all charts

  return (
    <div className="relative  group overflow-hidden text-left bg-white rounded-xl shadow-xl border-2 border-black/20 hover:shadow-2xl hover:border-black/40 transition p-6 h-full">
      
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center font-bold">
          <FiBarChart2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-950">Summary Analysis</h3>
          <p className="text-sm text-supergreen/80 mt-1 mb-4">Have a summary of key metrics at a glance</p>
        </div>
      </div>  
      {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-10">
        {/* Card: Total Admins */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Total Admins</div>
            <div className="text-xl font-extrabold text-black/80">{adminCount ?? '—'}</div>
          </div>
        </div>

        {/* Card: Admins with role */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Admins</div>
            <div className="text-xl font-extrabold text-black/80">{adminsWithRoleCount ?? '—'}</div>
          </div>
        </div>

        {/* Card: Batches */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Batches</div>
            <div className="text-xl font-extrabold text-black/80">{batchCount ?? '—'}</div>
          </div>
        </div>

        {/* Card: Unassigned Batches */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Unassigned Batches</div>
            <div className="text-xl font-extrabold text-black/80">{unassignedBatchesCount ?? '—'}</div>
          </div>
        </div>

        {/* Card: Students */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Students</div>
            <div className="text-xl font-extrabold text-black/80">{studentCount ?? '—'}</div>
          </div>
        </div>

        {/* Card: Today's Present */}
        <div className="rounded-lg p-[1px] bg-gradient-to-r from-fuchsia-700 to-purple-600">
          <div className="bg-white rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">Today's Present</div>
            <div className="text-xl font-extrabold text-black/80">{todaysPresentCount ?? '—'}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-gradient-to-r from-fuchsia-700 to-purple-600 text-white flex items-center justify-center font-bold">
          <FiEye className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-950">View Analysis</h3>
          <p className="text-sm text-supergreen/80 mt-1">Compare attendance percentages between branches</p>
        </div>
      </div>

      {/* Charts (always show all four) */}

      <div className="mt-4 h-full min-h-0 text-xs text-purple-950/60 leading-relaxed">
        {loading && <div>Loading charts…</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="transition-all duration-300 ease-out transform mt-3 h-full opacity-100 scale-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 h-full">
              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Bar Graph</div>
                <div className="flex-1 min-h-0">
                  <canvas ref={barRef} className="h-full w-full" />
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Pie Chart</div>
                <div className="flex-1 min-h-0">
                  <canvas ref={pieRef} className="h-full w-full" />
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Line Graph</div>
                <div className="flex-1 min-h-0">
                  <canvas ref={lineRef} className="h-full w-full" />
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Attendance Distribution</div>
                <div className="flex-1 min-h-0">
                  <canvas ref={doughnutRef} className="h-full w-full" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
