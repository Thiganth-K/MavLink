import { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiEye } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { attendanceAPI, superAdminAPI, batchAPI, studentAPI, mappingAPI } from '../services/api';
import type { AttendanceStats } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  LineController,
  PieController,
  DoughnutController,
  Tooltip,
  Legend
);

export default function ViewAnalysisCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AttendanceStats[] | null>(null);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  // Always show all charts; removed single-chart selection
  const [batchCount, setBatchCount] = useState<number | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  // avgAttendance removed — not shown in summary cards
  const [unassignedBatchesCount, setUnassignedBatchesCount] = useState<number | null>(null);
  const [adminsWithRoleCount, setAdminsWithRoleCount] = useState<number | null>(null);
  const [todaysPresentFNCount, setTodaysPresentFNCount] = useState<number | null>(null);
  const [todaysPresentANCount, setTodaysPresentANCount] = useState<number | null>(null);

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
        // default selection will be set from stats in an effect below
        setBatchCount(Array.isArray(batches) ? batches.length : null);
        setStudentCount(Array.isArray(students) ? students.length : null);
        setUnassignedBatchesCount(mapping && Array.isArray((mapping as any).unassignedBatches) ? (mapping as any).unassignedBatches.length : null);
        // count admins with role 'ADMIN' (case-insensitive)
        setAdminsWithRoleCount(Array.isArray(admins) ? admins.filter((a: any) => String(a.role || '').toUpperCase() === 'ADMIN').length : null);

        // average attendance computation removed (not displayed)

        // fetch today's attendance via batch-level counts if backend supports it
        try {
          const batchCounts = await attendanceAPI.getBatchPresentCounts(today).catch(() => []);
          if (Array.isArray(batchCounts) && batchCounts.length > 0) {
            let fn = 0;
            let an = 0;
            for (const b of batchCounts) {
              fn += Number(b.FN_present || 0);
              an += Number(b.AN_present || 0);
            }
            setTodaysPresentFNCount(fn);
            setTodaysPresentANCount(an);
          } else {
            // Fallback to older per-entry aggregation when batch endpoint not available
            const attended = await attendanceAPI.getAttendanceByDate(today).catch(() => null);

            // Helper to normalize any date-like value to YYYY-MM-DD in IST
            const toISTDateString = (val: any): string | null => {
              if (!val && val !== 0) return null;
              try {
                const d = new Date(val);
                if (isNaN(d.getTime())) return null;
                const ist = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
                const y = ist.getFullYear();
                const m = String(ist.getMonth() + 1).padStart(2, '0');
                const dd = String(ist.getDate()).padStart(2, '0');
                return `${y}-${m}-${dd}`;
              } catch (err) {
                return null;
              }
            };

            const flatten = (node: any, parentSessionDate?: any): any[] => {
              if (!node) return [];
              const out: any[] = [];
              if (Array.isArray(node)) {
                for (const el of node) out.push(...flatten(el, parentSessionDate));
                return out;
              }
              if (Array.isArray(node.FN) || Array.isArray(node.AN)) {
                const sessionDate = node.date ?? node.sessionDate ?? parentSessionDate;
                const normalized = toISTDateString(sessionDate);
                if (Array.isArray(node.FN)) for (const it of node.FN) out.push({ ...it, _sessionDate: normalized, _sessionPart: 'FN' });
                if (Array.isArray(node.AN)) for (const it of node.AN) out.push({ ...it, _sessionDate: normalized, _sessionPart: 'AN' });
                return out;
              }
              if (typeof node.status !== 'undefined' || typeof node.attendanceStatus !== 'undefined' || node.studentId || node.student) {
                const sessionDate = node.date ?? node.attendanceDate ?? node.sessionDate ?? parentSessionDate;
                return [{ ...node, _sessionDate: toISTDateString(sessionDate) }];
              }
              for (const key of ['records', 'attendances', 'students']) {
                if (Array.isArray(node[key])) {
                  out.push(...flatten(node[key], node.date ?? node.sessionDate ?? parentSessionDate));
                }
              }
              return out;
            };

            const entries = flatten(attended);
            const presentFNSet = new Set<string>();
            const presentANSet = new Set<string>();
            for (const e of entries) {
              const statusRaw = (e.status ?? e.attendanceStatus ?? '').toString();
              const status = statusRaw.toLowerCase().trim();
              const entryDate = (e._sessionDate ?? e.date ?? e.attendanceDate ?? e.sessionDate) as any;
              const entryDateStr = toISTDateString(entryDate);
              if (!entryDateStr || entryDateStr !== today) continue;
              if (!(status === 'present' || status === 'p' || status.indexOf('present') !== -1)) continue;
              const studentKey = String(e.studentId ?? e.student?._id ?? e.admissionNo ?? e.rollNo ?? e._id ?? '').trim();
              if (!studentKey) continue;
              const partRaw = (e._sessionPart ?? e.session ?? e.part ?? e.slot ?? '').toString();
              const part = partRaw.toLowerCase();
              if (part.includes('fn') || part === 'fn') presentFNSet.add(studentKey);
              else if (part.includes('an') || part === 'an') presentANSet.add(studentKey);
              else { presentFNSet.add(studentKey); presentANSet.add(studentKey); }
            }
            setTodaysPresentFNCount(presentFNSet.size);
            setTodaysPresentANCount(presentANSet.size);
          }
        } catch (e) {
          setTodaysPresentFNCount(null);
          setTodaysPresentANCount(null);
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

  // derive unique departments from stats and keep selection in state
  const uniqueDepts = useMemo(() => {
    if (!stats || !stats.length) return [] as string[];
    const set = new Set<string>();
    for (const s of stats) {
      const raw = (s as any).deptName ?? (s as any).dept ?? (s as any).department ?? '';
      let dept = String(raw || '').trim();
      if (!dept || /^dept(?:artment)?$/i.test(dept)) {
        const alt = (s as any).departmentName ?? (s as any).branch ?? (s as any).deptName ?? '';
        dept = String(alt || '').trim();
      }
      if (!dept) dept = 'Unknown';
      set.add(dept.replace(/\s+/g, ' '));
    }
    return Array.from(set).sort();
  }, [stats]);

  // Do not auto-select departments on load; charts stay empty until user selects.

  // filtered stats used for charts and summaries; if none selected, use all
  const filteredStats = useMemo(() => {
    if (!stats) return [] as AttendanceStats[];
    // When no departments are selected, show empty charts
    if (!selectedDepts || !selectedDepts.length) return [] as AttendanceStats[];
    const sel = new Set(selectedDepts.map(s => String(s).trim()));
    return stats.filter((s) => {
      const raw = (s as any).deptName ?? (s as any).dept ?? (s as any).department ?? '';
      let dept = String(raw || '').trim();
      if (!dept || /^dept(?:artment)?$/i.test(dept)) {
        const alt = (s as any).departmentName ?? (s as any).branch ?? (s as any).deptName ?? '';
        dept = String(alt || '').trim();
      }
      if (!dept) dept = 'Unknown';
      return sel.has(dept.replace(/\s+/g, ' '));
    });
  }, [stats, selectedDepts]);

  // derive chart data from `stats` using useMemo for performance
  const { labels, deptData, binLabels, binValues, commonOptions } = useMemo(() => {
    if (!filteredStats || !filteredStats.length) {
      return { labels: [], deptData: [], binLabels: [], binValues: [], commonOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom' as const } }
      } };
    }

    const grouped: Record<string, { total: number; count: number }> = {};
    for (const s of filteredStats) {
      const raw = (s as any).deptName ?? (s as any).dept ?? (s as any).department ?? '';
      let dept = String(raw).trim();
      if (!dept || /^dept(?:artment)?$/i.test(dept)) {
        const alt = (s as any).departmentName ?? (s as any).branch ?? (s as any).deptName ?? '';
        dept = String(alt || '').trim();
        if (!dept || /^dept(?:artment)?$/i.test(dept)) dept = 'Unknown';
      }
      dept = dept.replace(/\s+/g, ' ');
      if (!grouped[dept]) grouped[dept] = { total: 0, count: 0 };
      grouped[dept].total += Number(s.attendancePercentage || 0);
      grouped[dept].count += 1;
    }

    const entries = Object.keys(grouped).map((k) => ({
      dept: k,
      total: grouped[k].total,
      count: grouped[k].count,
      avg: grouped[k].count ? grouped[k].total / grouped[k].count : 0,
    }));
    entries.sort((a, b) => (b.count - a.count) || (b.avg - a.avg));

    const validEntries = entries.filter(
      (e) => e.count > 0 && !/^unknown$/i.test(e.dept) && !/^dept(?:artment)?$/i.test(e.dept)
    );

    const labels = validEntries.map(e => e.dept);
    const deptData = validEntries.map(e => Math.round((e.total / Math.max(1, e.count)) * 100) / 100);

    const bins = { '<50': 0, '50-70': 0, '70-90': 0, '90-100': 0 };
    for (const s of filteredStats) {
      const p = Number(s.attendancePercentage || 0);
      if (p < 50) bins['<50'] += 1;
      else if (p < 70) bins['50-70'] += 1;
      else if (p < 90) bins['70-90'] += 1;
      else bins['90-100'] += 1;
    }
    const binLabels = Object.keys(bins);
    const binValues = binLabels.map(l => bins[l as keyof typeof bins]);

    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'bottom' as const } }
    };

    return { labels, deptData, binLabels, binValues, commonOptions };
  }, [filteredStats]);

  // handlers for department selection
  const toggleDept = (d: string) => {
    setSelectedDepts((prev) => {
      const cur = Array.isArray(prev) ? [...prev] : [];
      if (cur.includes(d)) return cur.filter(x => x !== d);
      return [...cur, d];
    });
  };

  const selectAll = () => setSelectedDepts(uniqueDepts ? [...uniqueDepts] : []);
  const clearSelection = () => setSelectedDepts([]);

  // removed selection/fade effect — always showing all charts

  return (
    <div className="relative  group overflow-hidden text-left bg-white rounded-xl shadow-xl border-2 border-black/20 hover:shadow-2xl hover:border-black/40 transition p-6 h-full">
      
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 flex items-center justify-center font-bold">
          <FiBarChart2 className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-950">Summary Analysis</h3>
          <p className="text-sm text-supergreen/80 mt-1 mb-4">Have a summary of key metrics at a glance</p>
        </div>
      </div>  
      {/* Summary cards - uniform styling via MetricCard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-10">
        {[
          { label: 'Admins', value: adminsWithRoleCount },
          { label: 'Batches', value: batchCount },
          { label: 'Unassigned Batches', value: unassignedBatchesCount },
          { label: 'Students', value: studentCount },
          { label: "Today's Present  Forenoon", value: todaysPresentFNCount },
          { label: "Today's Present Afternoon", value: todaysPresentANCount },
        ].map((m, idx) => (
          <div key={idx} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between shadow-sm border border-purple-200">
            <div className="text-[13px] font-medium text-gray-700">{m.label}</div>
            <div className="text-2xl font-extrabold text-black/80">{m.value ?? '—'}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-purple-50 text-purple-700 border border-purple-600 flex items-center justify-center font-bold">
          <FiEye className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-950">View Analysis</h3>
          <p className="text-sm text-supergreen/80 mt-1">Compare attendance percentages between branches</p>
        </div>
      </div>

      {/* Department filter checkboxes - superadmin can pick depts to compare */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Filter Departments</div>
          <div className="flex gap-2">
            <button type="button" onClick={selectAll} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border">Select All</button>
            <button type="button" onClick={clearSelection} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded border">Clear</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-auto show-scrollbar p-1">
          {uniqueDepts && uniqueDepts.length > 0 ? (
            uniqueDepts.map((d) => (
              <label key={d} className="inline-flex items-center gap-2 bg-white border rounded px-2 py-1 text-sm">
                <input type="checkbox" checked={!!selectedDepts && selectedDepts.includes(d)} onChange={() => toggleDept(d)} />
                <span className="whitespace-nowrap">{d}</span>
              </label>
            ))
          ) : (
            <div className="text-xs text-gray-500">No departments available</div>
          )}
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
                  <div style={{ height: 200 }} className="w-full">
                    <Bar data={{ labels, datasets: [{ label: 'Avg Attendance %', data: deptData, backgroundColor: 'rgba(34,197,94,0.7)' }] }} options={commonOptions} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Pie Chart</div>
                <div className="flex-1 min-h-0">
                  <div style={{ height: 200 }} className="w-full">
                    <Pie data={{ labels, datasets: [{ label: 'Avg Attendance %', data: deptData, backgroundColor: labels.map((_, i) => `hsl(${(i / Math.max(1, labels.length)) * 360} 70% 50% / 0.8)`) }] }} options={commonOptions} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Line Graph</div>
                <div className="flex-1 min-h-0">
                  <div style={{ height: 200 }} className="w-full">
                    <Line data={{ labels, datasets: [{ label: 'Avg Attendance %', data: deptData, borderColor: 'rgba(16,185,129,0.9)', backgroundColor: 'rgba(16,185,129,0.2)', fill: true, tension: 0.2, pointRadius: 4 }] }} options={commonOptions} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded flex flex-col h-full min-h-0">
                <div className="text-sm font-medium mb-2">Attendance Distribution</div>
                <div className="flex-1 min-h-0">
                  <div style={{ height: 200 }} className="w-full">
                    <Doughnut data={{ labels: binLabels, datasets: [{ label: 'Students', data: binValues, backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6366f1'] }] }} options={commonOptions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
