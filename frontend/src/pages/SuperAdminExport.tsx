import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { departmentAPI, superAdminAPI } from '../services/api';

export default function SuperAdminExport() {
  const [departments, setDepartments] = useState<Array<{ deptId: string; deptName: string }>>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<'today' | 'thisWeek' | 'thisMonth' | 'all' | ''>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    const user = localStorage.getItem('user');
    if (!user || role !== 'SUPER_ADMIN') {
      toast.error('Access denied. Super Admin privileges required.');
      window.location.href = '/';
      return;
    }
    (async () => {
      try {
        const depts = await departmentAPI.listDepartments();
        setDepartments(Array.isArray(depts) ? depts : []);
      } catch (e: any) {
        toast.error(e.message || 'Failed to load departments');
      }
    })();
  }, []);

  const toggleDept = (deptId: string) => {
    setSelectedDeptIds(prev => prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]);
  };

  const quickSelectAll = () => {
    setSelectedDeptIds(departments.map(d => d.deptId));
  };

  const quickClearAll = () => setSelectedDeptIds([]);

  const download = async (allMode = false) => {
    setDownloading(true);
    try {
      const params: any = {};
      if (allMode) params.deptIds = 'ALL';
      else params.deptIds = selectedDeptIds.length ? selectedDeptIds : 'ALL';
      if (preset) params.preset = preset;
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;

      const blob = await superAdminAPI.exportAdvanced(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mavlink_export_advanced.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-100 to-violet-300 p-6">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-xl p-6 border border-violet-200">
        <h1 className="text-3xl font-extrabold text-violet-950 mb-2">Super Admin Export</h1>
        <p className="text-violet-700 mb-6">Select departments and date range or use quick presets to export filtered data. Use Super Export to include all departments and data.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-violet-900 mb-2">Departments</h2>
            <div className="flex gap-2 mb-3">
              <button onClick={quickSelectAll} className="px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Select All</button>
              <button onClick={quickClearAll} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Clear</button>
            </div>
            <div className="max-h-64 overflow-auto border border-violet-200 rounded-lg p-3 space-y-2 bg-violet-50">
              {departments.map(d => {
                const isSelected = selectedDeptIds.includes(d.deptId);
                return (
                  <label 
                    key={d.deptId} 
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all group border ${
                      isSelected 
                        ? 'bg-violet-100 border-violet-400' 
                        : 'bg-white border-transparent hover:bg-violet-50 hover:border-violet-300'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleDept(d.deptId);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 bg-white border-2 border-violet-400 rounded focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 cursor-pointer appearance-none"
                      />
                      {isSelected && (
                        <svg 
                          className="absolute top-0 left-0 w-5 h-5 text-violet-600 pointer-events-none" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm font-medium select-none flex-1 ${
                      isSelected ? 'text-violet-900' : 'text-violet-800 group-hover:text-violet-700'
                    }`}>
                      <span className="font-bold">{d.deptId}</span> <span className="text-violet-600">—</span> {d.deptName}
                    </span>
                  </label>
                );
              })}
              {departments.length === 0 && <div className="text-sm text-gray-600 text-center py-4">No departments found</div>}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-violet-900 mb-2">Date Range</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setPreset('today')} className={`px-3 py-1 rounded-lg ${preset === 'today' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Today</button>
              <button onClick={() => setPreset('thisWeek')} className={`px-3 py-1 rounded-lg ${preset === 'thisWeek' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>This Week</button>
              <button onClick={() => setPreset('thisMonth')} className={`px-3 py-1 rounded-lg ${preset === 'thisMonth' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>This Month</button>
              <button onClick={() => setPreset('all')} className={`px-3 py-1 rounded-lg ${preset === 'all' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>All Dates</button>
              <button onClick={() => setPreset('')} className={`px-3 py-1 rounded-lg ${preset === '' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>Custom</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600">Start Date</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="mt-1 w-full px-3 py-2 border border-violet-200 rounded-lg" />
              </div>
              <div>
                <label className="text-sm text-gray-600">End Date</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="mt-1 w-full px-3 py-2 border border-violet-200 rounded-lg" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Custom dates are used when preset is set to Custom.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button disabled={downloading} onClick={() => download(false)} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">Export Selected</button>
          <button disabled={downloading} onClick={() => download(true)} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 disabled:opacity-50">Super Export (All)</button>
        </div>
      </div>
    </div>
  );
}