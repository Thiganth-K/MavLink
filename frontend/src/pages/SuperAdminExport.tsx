import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { departmentAPI, superAdminAPI } from '../services/api';

export default function SuperAdminExport() {
  const [departments, setDepartments] = useState<Array<{ deptId: string; deptName: string }>>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<'today' | 'thisWeek' | 'thisMonth' | 'all' | ''>('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<number[] | null>(null);
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
        // load available export years from backend
        try {
          const yrs = await superAdminAPI.getExportYears();
          setAvailableYears(Array.isArray(yrs) ? yrs : []);
        } catch (e) {
          // non-fatal: keep availableYears null so UI falls back to manual input
          setAvailableYears(null);
        }
      } catch (e: any) {
        toast.error(e.message || 'Failed to load departments');
      }
    })();
  }, []);

  const handleYearChange = (year: string, checked: boolean) => {
    setSelectedYears(prev => {
      if (checked) {
        if (prev.includes(year)) return prev;
        return [...prev, year];
      } else {
        return prev.filter(y => y !== year);
      }
    });
  };

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
      if (selectedYears.length) params.batchYears = selectedYears;
      if (preset) params.preset = preset;
      if (customStart) params.startDate = customStart;
      if (customEnd) params.endDate = customEnd;

      const blob = await superAdminAPI.exportAdvanced(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'STARS_export_advanced.xlsx';
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
    <div className="min-h-screen bg-white p-6">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-violet-950 mb-4">Super Admin Export</h1>
            <p className="text-violet-700">Select departments and date range or use quick presets to export filtered data.</p>
            <p className="text-violet-700 mb-6">Use Super Export to include all departments and data.</p>
          </div>
          <div>
            <button
              onClick={() => { window.location.href = '/super-admin'; }}
              className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-violet-900 mb-2">Departments</h2>
            <div className="flex gap-2 mb-3">
              <button onClick={quickSelectAll} className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-600 rounded-lg hover:bg-violet-50">Select All</button>
              <button onClick={quickClearAll} className="px-3 py-1 bg-gray-50 text-gray-700 border border-gray-600 rounded-lg hover:bg-gray-50">Clear</button>
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
              <button onClick={() => setPreset('today')} className={`px-3 py-1 rounded-lg border ${preset === 'today' ? 'bg-violet-50 text-violet-700 border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-600 hover:bg-violet-50'}`}>Today</button>
              <button onClick={() => setPreset('thisWeek')} className={`px-3 py-1 rounded-lg border ${preset === 'thisWeek' ? 'bg-violet-50 text-violet-700 border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-600 hover:bg-violet-50'}`}>This Week</button>
              <button onClick={() => setPreset('thisMonth')} className={`px-3 py-1 rounded-lg border ${preset === 'thisMonth' ? 'bg-violet-50 text-violet-700 border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-600 hover:bg-violet-50'}`}>This Month</button>
              <button onClick={() => setPreset('all')} className={`px-3 py-1 rounded-lg border ${preset === 'all' ? 'bg-violet-50 text-violet-700 border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-600 hover:bg-violet-50'}`}>All Dates</button>
              <button onClick={() => setPreset('')} className={`px-3 py-1 rounded-lg border ${preset === '' ? 'bg-violet-50 text-violet-700 border-violet-600' : 'bg-violet-50 text-violet-700 border-violet-600 hover:bg-violet-50'}`}>Custom</button>
            </div>
            <div className="mt-3 mb-3">
              <label className="text-sm font-medium text-violet-800 mr-2">Filter by Batch Year</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {availableYears === null ? (
                  // fallback hardcoded options if backend call failed
                  ['2026','2027'].map(y => {
                    const isSel = selectedYears.includes(y);
                    return (
                      <label key={y} className={`flex items-center gap-2 p-1 rounded ${isSel ? 'bg-violet-100' : ''}`}>
                        <div className="relative flex-shrink-0">
                          <input type="checkbox" checked={isSel} onChange={(e) => handleYearChange(y, (e.target as HTMLInputElement).checked)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 bg-white border-2 border-violet-400 rounded appearance-none cursor-pointer" />
                          {isSel && (
                            <svg className="absolute top-0 left-0 w-4 h-4 text-violet-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{y}</span>
                      </label>
                    );
                  })
                ) : (availableYears.length ? availableYears.map(y => {
                  const ys = String(y);
                  const isSel = selectedYears.includes(ys);
                  return (
                    <label key={y} className={`flex items-center gap-2 p-1 rounded ${isSel ? 'bg-violet-100' : ''}`}>
                      <div className="relative flex-shrink-0">
                        <input type="checkbox" checked={isSel} onChange={(e) => handleYearChange(ys, (e.target as HTMLInputElement).checked)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 bg-white border-2 border-violet-400 rounded appearance-none cursor-pointer" />
                        {isSel && (
                          <svg className="absolute top-0 left-0 w-4 h-4 text-violet-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{String(y)}</span>
                    </label>
                  );
                }) : (
                  ['2026','2027'].map(y => {
                    const isSel = selectedYears.includes(y);
                    return (
                      <label key={y} className={`flex items-center gap-2 p-1 rounded ${isSel ? 'bg-violet-100' : ''}`}>
                        <div className="relative flex-shrink-0">
                          <input type="checkbox" checked={isSel} onChange={(e) => handleYearChange(y, (e.target as HTMLInputElement).checked)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 bg-white border-2 border-violet-400 rounded appearance-none cursor-pointer" />
                          {isSel && (
                            <svg className="absolute top-0 left-0 w-4 h-4 text-violet-600 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm">{y}</span>
                      </label>
                    );
                  })
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">Selecting years will limit export to batches from those years.</p>
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
          <button disabled={downloading} onClick={() => download(false)} className="px-4 py-2 bg-violet-50 text-violet-700 border border-violet-600 rounded-lg hover:bg-violet-50 disabled:opacity-50">Export Selected</button>
          <button disabled={downloading} onClick={() => download(true)} className="px-4 py-2 bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-600 rounded-lg hover:bg-fuchsia-50 disabled:opacity-50">Super Export (All)</button>
        </div>
      </div>
      </div>
    </div>
  );
}