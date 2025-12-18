import { useEffect, useMemo, useState } from 'react';
import { batchAPI, guestAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function GuestExport() {
  const [batches, setBatches] = useState<Array<any>>([]);
  const [appliedYear, setAppliedYear] = useState<string | null>(null);
  const [checkedBatches, setCheckedBatches] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = async (preserveSelections: boolean = true) => {
    setLoading(true);
    try {
      const profileRes: any = await guestAPI.getProfile();
      const profile = profileRes.profile || {};
      const all = await batchAPI.getBatches();
      const assigned = Array.isArray(profile.assignedBatchIds) ? profile.assignedBatchIds.map((x: any) => String(x).toUpperCase()) : [];
      const my = Array.isArray(all) ? all.filter((b: any) => assigned.includes(String(b.batchId || '').toUpperCase())) : [];
      setBatches(my);
      // initialize checked map for newly loaded batches
      const map: Record<string, boolean> = {};
      my.forEach((b: any) => {
        const key = String(b.batchId).toUpperCase();
        map[key] = preserveSelections ? !!checkedBatches[key] : false;
      });
      setCheckedBatches(map);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load batches');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    // clear year and selections, then reload batches
    setAppliedYear(null);
    setCheckedBatches({});
    setDownloading(false);
    await load(false);
  };

  useEffect(() => { load(); const t = window.setInterval(() => load(), 30000); return () => window.clearInterval(t); }, []);

  const years = useMemo(() => {
    const s = new Set<string>();
    (batches || []).forEach((b: any) => { if (b.batchYear) s.add(String(b.batchYear)); });
    return Array.from(s).sort((a,b) => Number(b) - Number(a));
  }, [batches]);

  const filteredBatches = useMemo(() => {
    if (!appliedYear) return batches;
    return batches.filter((b: any) => String(b.batchYear) === appliedYear);
  }, [batches, appliedYear]);

  const toggleYear = (y: string) => {
    setAppliedYear(prev => prev === y ? null : y);
  };

  const toggleBatch = (id: string) => {
    const key = String(id).toUpperCase();
    setCheckedBatches(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportSelected = async () => {
    const selected = Object.keys(checkedBatches).filter(k => checkedBatches[k]);
    if (!selected.length) { toast.error('Select at least one batch'); return; }
    setDownloading(true);
    try {
      const blob = await guestAPI.exportData(selected);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `STARS_guest_export_selected.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const exportAll = async () => {
    const source = appliedYear ? filteredBatches : batches;
    const ids = (source || []).map((b: any) => String(b.batchId || '').toUpperCase()).filter(Boolean);
    if (!ids.length) { toast.error('No batches to export'); return; }
    setDownloading(true);
    try {
      const blob = await guestAPI.exportData(ids);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = appliedYear ? `STARS_guest_export_${appliedYear}.xlsx` : `STARS_guest_export_all_years.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    } finally {
      setDownloading(false);
    }
  };

  

  // Export All removed — use Export Selected or navigate from Welcome Export CTA

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-violet-950 mb-2">Guest Export</h1>
            <p className="text-violet-700">Filter by year and select assigned batches to export. Only batch names are shown.</p>
          </div>
          <div className="flex gap-2">
            <button disabled={loading} onClick={refreshAll} className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-600 rounded-lg">Refresh</button>
            <button onClick={() => { window.location.href = '/guest'; }} className="px-3 py-1 bg-white text-purple-700 border border-purple-600 rounded-lg">Back</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-violet-900 mb-2">Years</h2>
            <div className="flex gap-2 flex-wrap items-center">
              {years.length === 0 && <div className="text-sm text-gray-600">No years available</div>}
              {years.map(y => (
                <button key={y} onClick={() => toggleYear(y)} className={`px-3 py-1 rounded-lg border ${appliedYear === y ? 'bg-violet-100 text-violet-700 border-violet-600' : 'bg-white text-violet-700 border-violet-600 hover:bg-violet-50'}`}>{y}</button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-violet-900 mb-2">Assigned Batches</h2>
            <div className="max-h-72 overflow-auto border border-violet-200 rounded-lg p-3 space-y-2 bg-violet-50">
              {filteredBatches.length === 0 && <div className="text-sm text-gray-600 text-center py-4">No batches found</div>}
              {filteredBatches.map((b: any) => {
                const id = String(b.batchId || '').toUpperCase();
                return (
                  <div key={id} className="flex items-center justify-between">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input value={id} type="checkbox" className="accent-purple-600" checked={!!checkedBatches[id]} onChange={() => toggleBatch(id)} />
                      <span className="text-sm text-violet-900">{b.batchName || id}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button disabled={downloading || loading} onClick={exportSelected} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-600 rounded-lg disabled:opacity-50">Export Selected</button>
            <button disabled={downloading || loading || batches.length===0} onClick={exportAll} className="px-4 py-2 bg-violet-600 text-white rounded-lg disabled:opacity-50">Export All</button>
          </div>
        </div>
      </div>
    </div>
  );
}
