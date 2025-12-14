import { useEffect, useState, useMemo, useRef } from 'react';
import { attendanceAPI, departmentAPI, batchAPI, type AttendanceStats, type Batch } from '../../services/api';
import toast from 'react-hot-toast';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement);

interface DeptOption { deptId: string; deptName: string; }

export default function StudentAnalysisDashboard() {
  
  const [allDepts, setAllDepts] = useState<DeptOption[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | ''>('');
  const [stats, setStats] = useState<AttendanceStats[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortKey, setSortKey] = useState<'attendancePercentage' | 'regno' | 'studentname'>('attendancePercentage');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');

  const distributionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const distributionChartRef = useRef<Chart | null>(null);
  const trendChartRef = useRef<Chart | null>(null);

  useEffect(() => { loadDepartments(); }, []);

  // Fetch stats whenever any filter changes (including clearing filters)
  useEffect(() => { fetchStats(); }, [selectedDept, startDate, endDate, selectedYear]);

  const loadDepartments = async () => {
    try {
      const list = await departmentAPI.listDepartments();
      const opts = Array.isArray(list) ? list.map((d: any) => ({ deptId: d.deptId, deptName: d.deptName })) : [];
      setAllDepts(opts);
      // do not set displayed `departments` here; it will be derived from `allDepts` and `batches`
      // Keep default empty selection ("Select Department"). Do not auto-select the first department.
    } catch (err: any) { toast.error(err.message || 'Failed to load departments'); }
  };

  // Load batches and compute available years
  useEffect(() => {
    const loadBatches = async () => {
      try {
        const bs = await batchAPI.getBatches().catch(() => [] as Batch[]);
        setBatches(Array.isArray(bs) ? bs : []);
        const ys = Array.from(new Set((Array.isArray(bs) ? bs.map(b => Number(b.batchYear)) : []).filter(n => !isNaN(n)))).sort((a, b) => b - a);
        setYears(ys);
        // Default year is All Years (empty string). Do not auto-select newest year.
      } catch (err) {
        // non-fatal
      }
    };
    loadBatches();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await attendanceAPI.getAttendanceStats(startDate || undefined, endDate || undefined, undefined, selectedDept || undefined, selectedYear === '' ? undefined : selectedYear);
      setStats(Array.isArray(data) ? data : []);
    } catch (err: any) { toast.error(err.message || 'Failed to load attendance stats'); }
  };

  // Derived displayed years and departments based on selected filters
  const displayedYears = useMemo(() => {
    if (selectedDept) {
      const ys = Array.from(new Set(batches.filter(b => String(b.deptId || '').toUpperCase() === String(selectedDept).toUpperCase()).map(b => Number(b.batchYear)).filter(n => !isNaN(n))));
      return ys.sort((a, b) => b - a);
    }
    return years;
  }, [batches, selectedDept, years]);

  const displayedDepartments = useMemo(() => {
    if (selectedYear !== '' && selectedYear !== undefined) {
      const depts = Array.from(new Set(batches.filter(b => Number(b.batchYear) === Number(selectedYear)).map(b => String(b.deptId || '').toUpperCase())));
      // map back to dept objects (preserve original casing/name)
      return allDepts.filter(d => depts.includes(String(d.deptId).toUpperCase()));
    }
    return allDepts;
  }, [batches, selectedYear, allDepts]);

  // Ensure selection stays valid when displayed options change
  useEffect(() => {
    // If there are no years for the current department, clear the year selection (All Years)
    if (!displayedYears || displayedYears.length === 0) {
      if (selectedYear !== '') setSelectedYear('');
      return;
    }
    // If user has explicitly selected a year but it becomes unavailable, reset to All Years
    if (selectedYear !== '' && !displayedYears.includes(Number(selectedYear))) {
      setSelectedYear('');
    }
  }, [displayedYears]);

  useEffect(() => {
    if (displayedDepartments && displayedDepartments.length) {
      // Only auto-fix when an existing selection becomes invalid. Do not auto-select on load.
      if (selectedDept && !displayedDepartments.some(d => d.deptId === selectedDept)) {
        setSelectedDept(displayedDepartments[0].deptId);
      }
    } else {
      setSelectedDept('');
    }
  }, [displayedDepartments, selectedDept]);

  const filteredSorted = useMemo(() => {
    let rows = stats;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => (r.regno || '').toLowerCase().includes(q) || (r.studentname || '').toLowerCase().includes(q));
    }
    rows = [...rows].sort((a, b) => {
      let av: any = a[sortKey];
      let bv: any = b[sortKey];
      if (sortKey === 'attendancePercentage') { av = a.attendancePercentage; bv = b.attendancePercentage; }
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [stats, search, sortKey, sortDir]);

  const distribution = useMemo(() => {
    const buckets = { '0-39': 0, '40-59': 0, '60-74': 0, '75-100': 0 } as Record<string, number>;
    stats.forEach(s => {
      const pct = s.attendancePercentage || 0;
      if (pct < 40) buckets['0-39']++; else if (pct < 60) buckets['40-59']++; else if (pct < 75) buckets['60-74']++; else buckets['75-100']++;
    });
    return buckets;
  }, [stats]);

  const trendData = useMemo(() => stats.map(s => ({ pct: s.attendancePercentage || 0, regno: s.regno || '' })).sort((a, b) => a.pct - b.pct), [stats]);

  const averagePct = useMemo(() => stats.length ? Math.round((stats.reduce((acc, s) => acc + (s.attendancePercentage || 0), 0) / stats.length) * 100) / 100 : 0, [stats]);
  const belowThreshold = useMemo(() => stats.filter(s => (s.attendancePercentage || 0) < 75).length, [stats]);

  const toggleSort = (key: typeof sortKey) => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } };

  // Charts: defer init via requestAnimationFrame to avoid StrictMode double-mount issues
  useEffect(() => {
    let raf: number | null = null;
    const run = () => {
      const canvasEl = distributionCanvasRef.current;
      if (!canvasEl || !canvasEl.isConnected) return;
      const labels = Object.keys(distribution);
      if (!labels.length) return;
      const values = labels.map(l => distribution[l]);
      if (distributionChartRef.current) {
        if (distributionChartRef.current.data.datasets?.[0]) {
          distributionChartRef.current.data.labels = labels;
          distributionChartRef.current.data.datasets[0].data = values;
        }
        distributionChartRef.current.update();
      } else {
        distributionChartRef.current = new Chart(canvasEl, {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Students count', data: values, backgroundColor: ['#ede9fe','#ddd6fe','#c4b5fd','#a78bfa'], borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { title: { display: true, text: 'Attendance % Range' } }, y: { title: { display: true, text: 'Students' }, beginAtZero: true, ticks: { precision: 0 } } } }
        });
      }
    };
    raf = requestAnimationFrame(run);
    return () => { if (raf) cancelAnimationFrame(raf); try { distributionChartRef.current?.destroy(); } catch {}; distributionChartRef.current = null; };
  }, [distribution]);

  useEffect(() => {
    let raf: number | null = null;
    const run = () => {
      const canvasEl = trendCanvasRef.current;
      if (!canvasEl || !canvasEl.isConnected) return;
      const labels = trendData.map((_, i) => `${i+1}`);
      if (!labels.length) return;
      const values = trendData.map(d => d.pct);
      if (trendChartRef.current) {
        if (trendChartRef.current.data.datasets?.[0]) {
          trendChartRef.current.data.labels = labels;
          trendChartRef.current.data.datasets[0].data = values;
        }
        trendChartRef.current.update();
      } else {
        trendChartRef.current = new Chart(canvasEl, {
          type: 'line',
          data: { labels, datasets: [{ label: 'Attendance % (sorted ascending)', data: values, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,0.15)', tension: 0.25, pointRadius: 0, borderWidth: 2, fill: true }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: true } }, scales: { x: { title: { display: true, text: 'Student Rank (lowest to highest %)' }, ticks: { maxRotation: 0 } }, y: { title: { display: true, text: 'Attendance %' }, beginAtZero: true, suggestedMax: 100 } } }
        });
      }
    };
    raf = requestAnimationFrame(run);
    return () => { if (raf) cancelAnimationFrame(raf); try { trendChartRef.current?.destroy(); } catch {}; trendChartRef.current = null; };
  }, [trendData]);

  return (
    <main className="flex-grow p-6 bg-gradient-to-br from-supercream to-violet-200">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-supergreenDark">Student Analysis Dashboard</h2>
          <button onClick={() => { window.location.href = '/super-admin'; }} className="px-4 py-2 bg-white border border-supergreenDark/30 text-supergreenDark rounded-lg shadow hover:border-supergreenAccent transition-colors">Back to Dashboard</button>
        </div>

        {/* Metrics Card */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-6 border border-supergreenDark/20">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-supergreenDark mb-1">Department</label>
              <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="px-3 py-2 rounded-lg border border-supergreenDark/30 focus:ring-2 focus:ring-supergreenAccent">
                <option value="">Select Department</option>
                {displayedDepartments.map(d => <option key={d.deptId} value={d.deptId}>{d.deptId} - {d.deptName}</option>)}
                {!displayedDepartments.length && <option value="" disabled>Loading...</option>}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-supergreenDark mb-1">Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))} className="px-3 py-2 rounded-lg border border-supergreenDark/30">
                <option value="">Select year</option>
                {displayedYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button type="button" onClick={() => { setSelectedDept(''); setSelectedYear(''); }} className="px-3 py-2 rounded bg-white border border-supergreenDark/20 text-sm hover:bg-gray-50">Clear all</button>
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-supergreenDark mb-1">Start Date (optional)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 rounded-lg border border-supergreenDark/30" />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-supergreenDark mb-1">End Date (optional)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 rounded-lg border border-supergreenDark/30" />
            </div>
            <div className="flex flex-col flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-supergreenDark mb-1">Search</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Reg no / Name" className="px-3 py-2 rounded-lg border border-supergreenDark/30" />
            </div>
            {/* Refresh button removed per UI preference */}
          </div>
          <div className="mt-4 flex gap-2 sm:gap-4 md:gap-6 justify-between items-stretch">
            <div className="flex flex-col bg-supercream/60 rounded-lg px-2 py-3 sm:px-3 sm:py-4 md:p-4 w-1/3 min-w-0 shadow">
              <span className="text-[11px] sm:text-xs text-supergreenDark/70 font-medium">Avg Attendance %</span>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-supergreenDark mt-1">{averagePct.toFixed(2)}%</span>
            </div>
            <div className="flex flex-col bg-supercream/60 rounded-lg px-2 py-3 sm:px-3 sm:py-4 md:p-4 w-1/3 min-w-0 shadow">
              <span className="text-[11px] sm:text-xs text-supergreenDark/70 font-medium">Students &lt; 75%</span>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 mt-1">{belowThreshold}</span>
            </div>
            <div className="flex flex-col bg-supercream/60 rounded-lg px-2 py-3 sm:px-3 sm:py-4 md:p-4 w-1/3 min-w-0 shadow">
              <span className="text-[11px] sm:text-xs text-supergreenDark/70 font-medium">Total Students</span>
              <span className="text-lg sm:text-xl md:text-2xl font-bold text-supergreenDark mt-1">{stats.length}</span>
            </div>
          </div>
        </div>

        {/* Distribution Card (separated) */}
        <div className="bg-white rounded-xl shadow-xl p-5 mb-6 border border-supergreenDark/20">
          <h3 className="text-lg font-bold text-supergreenDark mb-4">Attendance Percentage Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs mb-4">
            {Object.entries(distribution).map(([label, count]) => (
              <div key={label} className="bg-supercream/60 rounded-md p-3 border border-supergreenDark/20 flex flex-col">
                <span className="font-semibold text-supergreenDark">{label}</span>
                <span className="text-supergreenDark/70 mt-1">{count}</span>
              </div>
            ))}
          </div>
          <div className="h-56 relative">
            <canvas ref={distributionCanvasRef} />
          </div>
          <p className="text-xs text-supergreenDark/60 mt-3">Bar chart shows how many students fall into each attendance percentage range.</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-5 mb-6 border border-supergreenDark/20">
          <h3 className="text-lg font-bold text-supergreenDark mb-4">Attendance Percentage Trend (Sorted)</h3>
          <div className="h-48 relative"><canvas ref={trendCanvasRef} /></div>
          <p className="text-xs text-supergreenDark/60 mt-3">Line plot of student attendance percentages (ascending). Gaps indicate performance cliffs.</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-5 mb-6 border border-supergreenDark/20">
          <h3 className="text-lg font-bold text-supergreenDark mb-4">Top & Bottom Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-supergreenDark mb-2">Top 5</h4>
              <ul className="space-y-2">
                {trendData.slice(-5).reverse().map(d => (
                  <li key={`top-${d.regno}`} className="flex items-center justify-between bg-supercream/60 rounded-md px-3 py-2 text-xs">
                    <span className="font-medium text-supergreenDark">{d.regno}</span>
                    <span className="text-supergreenDark/70">{d.pct.toFixed(1)}%</span>
                  </li>
                ))}
                {trendData.length === 0 && <li className="text-supergreenDark/60 text-xs">No data</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-supergreenDark mb-2">Bottom 5</h4>
              <ul className="space-y-2">
                {trendData.slice(0,5).map(d => (
                  <li key={`bottom-${d.regno}`} className="flex items-center justify-between bg-supercream/60 rounded-md px-3 py-2 text-xs">
                    <span className="font-medium text-supergreenDark">{d.regno}</span>
                    <span className="text-supergreenDark/70">{d.pct.toFixed(1)}%</span>
                  </li>
                ))}
                {trendData.length === 0 && <li className="text-supergreenDark/60 text-xs">No data</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-5 border border-supergreenDark/20">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold text-supergreenDark">Students ({filteredSorted.length})</h3>
            <div className="flex gap-2 text-xs">
              <button onClick={() => toggleSort('attendancePercentage')} className={`px-3 py-1 rounded border ${sortKey==='attendancePercentage' ? 'bg-supergreenDark text-white' : 'bg-white text-supergreenDark'}`}>Sort % {sortKey==='attendancePercentage' ? (sortDir==='asc'?'↑':'↓') : ''}</button>
              <button onClick={() => toggleSort('regno')} className={`px-3 py-1 rounded border ${sortKey==='regno' ? 'bg-supergreenDark text-white' : 'bg-white text-supergreenDark'}`}>Reg No {sortKey==='regno' ? (sortDir==='asc'?'↑':'↓') : ''}</button>
              <button onClick={() => toggleSort('studentname')} className={`px-3 py-1 rounded border ${sortKey==='studentname' ? 'bg-supergreenDark text-white' : 'bg-white text-supergreenDark'}`}>Name {sortKey==='studentname' ? (sortDir==='asc'?'↑':'↓') : ''}</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-supergreenDark/20">
              <thead>
                <tr className="bg-supercream">
                  <th className="border border-supergreenDark/20 px-3 py-2 text-left text-supergreenDark font-semibold">Reg No</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-left text-supergreenDark font-semibold">Name</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Present</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Absent</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">On-Duty</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Late</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Sick-Leave</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Total</th>
                  <th className="border border-supergreenDark/20 px-3 py-2 text-center text-supergreenDark font-semibold">Attd %</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map(s => {
                  const pct = s.attendancePercentage || 0;
                  // Support multiple possible field names from backend: prefer explicit keys if present
                  const late = (s as any).late ?? (s as any).lateCount ?? 0;
                  const sick = (s as any).sickLeave ?? (s as any).sickLeaveCount ?? (s as any).sick ?? 0;

                  let badge = 'bg-gray-50 text-gray-700 border border-gray-400';
                  if (pct >= 75) badge = 'bg-violet-50 text-violet-700 border border-violet-600';
                  else if (pct >= 60) badge = 'bg-yellow-50 text-yellow-700 border border-yellow-600';
                  else if (pct >= 40) badge = 'bg-orange-50 text-orange-700 border border-orange-600';
                  else badge = 'bg-red-50 text-red-700 border border-red-600';
                  return (
                    <tr key={s._id || s.regno} className="hover:bg-supercream/40">
                      <td className="border border-supergreenDark/10 px-3 py-2 text-supergreenDark text-sm">{s.regno}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-supergreenDark text-sm">{s.studentname}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{s.present}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{s.absent}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{s.onDuty}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{late}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{sick}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center text-supergreenDark text-sm">{s.totalClasses}</td>
                      <td className="border border-supergreenDark/10 px-3 py-2 text-center">
                        <span className={`inline-block min-w-[58px] px-2 py-1 rounded-full text-xs font-semibold ${badge}`} title={`Present: ${s.present} | Absent: ${s.absent} | On-Duty: ${s.onDuty} | Late: ${late} | Sick: ${sick} | Total: ${s.totalClasses}`}>{pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSorted.length && (
                  <tr>
                    <td colSpan={9} className="border border-supergreenDark/10 px-3 py-8 text-center text-supergreenDark/70 text-sm">No records match filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
