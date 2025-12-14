import { useEffect, useRef, useState, useMemo } from 'react';
import SuperAdminNavbar from '../../components/SuperAdmin/SuperAdminNavbar';
import SuperAdminFooter from '../../components/SuperAdmin/SuperAdminFooter';
import { mappingAPI, batchAPI } from '../../services/api';
import type { AdminBatchMapping } from '../../services/api';
import ForceGraph2D from 'react-force-graph-2d';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const palette = [
  'bg-violet-100 border-violet-400 text-violet-900',
  'bg-fuchsia-100 border-fuchsia-400 text-fuchsia-900',
  'bg-pink-100 border-pink-400 text-pink-900',
  'bg-purple-100 border-purple-400 text-purple-900',
  'bg-indigo-100 border-indigo-400 text-indigo-900',
  'bg-violet-200 border-violet-500 text-violet-900',
  'bg-fuchsia-200 border-fuchsia-500 text-fuchsia-900',
  'bg-indigo-200 border-indigo-500 text-indigo-900'
];

interface AdminCardProps {
  admin: { adminId: string; username: string; batches: Array<{ batchId: string; batchName: string; batchYear: number; deptId: string }> };
  colorClass: string;
}

function AdminCard({ admin, colorClass }: AdminCardProps) {
  return (
    <div className={`rounded-xl border p-4 shadow-sm flex flex-col gap-3 ${colorClass}`}>      
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold tracking-tight">{admin.username}</h3>
        <span className="text-xs font-mono opacity-70">{admin.adminId}</span>
      </div>
      {admin.batches.length === 0 && (
        <p className="text-sm italic opacity-70">No batches assigned</p>
      )}
      <ul className="flex flex-wrap gap-2">
        {admin.batches.map(b => (
          <li key={b.batchId} className="px-2 py-1 text-xs rounded-md bg-white/60 backdrop-blur border border-white/70 shadow-inner">
            <span className="font-semibold">{b.batchName}</span>
            <span className="ml-1 opacity-70">({b.batchId})</span>
            <span className="ml-1 text-[10px] opacity-50">{b.deptId}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminBatchMappingPage() {
  const [data, setData] = useState<AdminBatchMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'matrix' | 'mapping ' | 'dept' | 'summary' | 'graph'>('cards');
  const [adminFilter, setAdminFilter] = useState('');
  const [deptFilter] = useState('');
  const [mutating, setMutating] = useState(false);
  const summaryChartRef = useRef<HTMLCanvasElement | null>(null);
  const summaryChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await mappingAPI.getAdminBatchMapping();
        if (mounted) setData(res);
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load mapping');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const adminsAll = data?.admins || [];
  const unassignedAll = data?.unassignedBatches || [];
  const adminFilterLower = adminFilter.trim().toLowerCase();
  const deptFilterLower = deptFilter.trim().toLowerCase();
  const admins = useMemo(() => adminsAll.filter(a => !adminFilterLower || a.username.toLowerCase().includes(adminFilterLower)), [adminsAll, adminFilterLower]);
  const unassigned = useMemo(() => unassignedAll.filter(b => !deptFilterLower || (b.deptId || '').toLowerCase().includes(deptFilterLower)), [unassignedAll, deptFilterLower]);

  // Compute department grouping structure: dept -> { batches:[], admins:Set }
  const deptGrouping = (() => {
    if (!data) return [] as Array<{ deptId: string; batches: any[]; admins: string[] }>;
    const map = new Map<string, { batches: any[]; admins: Set<string> }>();
    for (const a of data.admins) {
      for (const b of a.batches) {
        const key = b.deptId || 'UNKNOWN';
        if (!map.has(key)) map.set(key, { batches: [], admins: new Set() });
        map.get(key)!.batches.push(b);
        map.get(key)!.admins.add(a.username);
      }
    }
    for (const b of data.unassignedBatches) {
      const key = b.deptId || 'UNKNOWN';
      if (!map.has(key)) map.set(key, { batches: [], admins: new Set() });
      map.get(key)!.batches.push(b);
    }
    return Array.from(map.entries()).map(([deptId, v]) => ({ deptId, batches: v.batches, admins: Array.from(v.admins) }));
  })();

  // Build mapping  cells: rows = batches, cols = admins, value=1 if assigned else 0.
  const mapping  = (() => {
    if (!data) return { rows: [] as any[], admins: [] as string[] };
    const allBatches: any[] = [];
    const seen = new Set<string>();
    for (const a of admins) for (const b of a.batches) { if (!seen.has(b.batchId)) { if (!deptFilterLower || (b.deptId||'').toLowerCase().includes(deptFilterLower)) { allBatches.push(b); } seen.add(b.batchId); } }
    for (const b of unassigned) if (!seen.has(b.batchId)) { if (!deptFilterLower || (b.deptId||'').toLowerCase().includes(deptFilterLower)) { allBatches.push(b); } seen.add(b.batchId); }
    const adminIds = admins.map(a => a.adminId);
    const rows = allBatches.map(b => ({
      batchId: b.batchId,
      batchName: b.batchName,
      deptId: b.deptId,
      values: adminIds.map(id => admins.some(a => a.adminId === id && a.batches.some(x => x.batchId === b.batchId)) ? 1 : 0)
    }));
    return { rows, admins: adminIds };
  })();

  // Summary data (batch counts per admin)
  const summaryData = admins.map(a => ({ label: a.username, value: a.batches.length }));

  // Render summary chart when in summary mode
  useEffect(() => {
    if (viewMode !== 'summary') { if (summaryChartInstance.current) { summaryChartInstance.current.destroy(); summaryChartInstance.current = null; } return; }
    if (!summaryChartRef.current) return;
    if (summaryChartInstance.current) summaryChartInstance.current.destroy();
    summaryChartInstance.current = new Chart(summaryChartRef.current, {
      type: 'bar',
      data: {
        labels: summaryData.map(d => d.label),
        datasets: [{ label: 'Batch count', data: summaryData.map(d => d.value), backgroundColor: 'rgba(16,185,129,0.7)' }]
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }, [viewMode, summaryData]);

  // Build matrix rows (all batches) with columns per adminId
  const matrixRows = (() => {
    if (!data) return [] as Array<any>;
    const batchIndex: Record<string, { batchId: string; batchName: string; deptId: string }> = {};
    for (const a of data.admins) {
      for (const b of a.batches) batchIndex[b.batchId] = { batchId: b.batchId, batchName: b.batchName, deptId: b.deptId };
    }
    for (const b of data.unassignedBatches) batchIndex[b.batchId] = { batchId: b.batchId, batchName: b.batchName, deptId: b.deptId };
    const rows = Object.values(batchIndex);
    return rows.map(r => ({
      ...r,
      assignedTo: data.admins.filter(a => a.batches.some(b => b.batchId === r.batchId)).map(a => a.adminId)
    }));
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <SuperAdminNavbar/>
      <main className="flex-grow px-4 py-8 max-w-7xl mx-auto w-full">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-supergreenDark">Admin ↔ Batch Mapping</h1>
              <p className="text-sm opacity-70 mt-1">Generated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '...'}</p>
              <p className="text-sm opacity-70">{data?.totalAdmins ?? 0} admins · {data?.totalBatches ?? 0} batches</p>
            </div>
            <button
              onClick={() => { window.location.href = '/super-admin'; }}
              className="px-4 py-2 rounded-md text-sm font-medium bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50"
            >
              Back to Dashboard
            </button>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex flex-wrap gap-4 items-end justify-between mb-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-supergreenDark mb-1">Filter Admin</label>
                  <input value={adminFilter} onChange={e => setAdminFilter(e.target.value)} placeholder="username contains..." className="px-2 py-1 rounded border text-sm" />
                </div>
                {mutating && <div className="text-xs text-violet-700 animate-pulse">Updating...</div>}
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'cards' ? 'bg-purple-50 text-purple-700 border border-purple-600' : 'bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50'}`}
                >Cards</button>
                
                <button
                  onClick={() => setViewMode('mapping ')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'mapping ' ? 'bg-purple-50 text-purple-700 border border-purple-600' : 'bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50'}`}
                >Mapping </button>
                
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'summary' ? 'bg-purple-50 text-purple-700 border border-purple-600' : 'bg-purple-50 text-purple-700 border border-purple-600 hover:bg-purple-50'}`}
                >Summary</button>
                
                {/* Manual refresh button removed per UI preference; mapping updates still occur after mutations */}
              </div>
            </div>

            {loading && (
              <div className="w-full p-4 text-center text-sm animate-pulse">Loading mapping...</div>
            )}
            {error && (
              <div className="w-full p-4 mb-4 rounded-md bg-red-100 border border-red-300 text-red-800 text-sm">{error}</div>
            )}

            {!loading && !error && viewMode === 'cards' && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {admins.map((a, idx) => (
                  <AdminCard key={a.adminId} admin={a} colorClass={palette[idx % palette.length]} />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {!loading && !error && viewMode === 'cards' && (
          <></>
        )}

        {!loading && !error && viewMode === 'matrix' && (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-supergreen text-supercream">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Batch</th>
                  {admins.map(a => (
                    <th key={a.adminId} className="px-3 py-2 font-semibold whitespace-nowrap">{a.username}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map(r => (
                  <tr key={r.batchId} className="odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-col"><span className="font-medium">{r.batchName}</span><span className="text-xs opacity-60">{r.batchId} · {r.deptId}</span></div>
                    </td>
                    {admins.map((a, idx) => {
                      const assigned = r.assignedTo.includes(a.adminId);
                      return (
                        <td key={a.adminId} className="px-3 py-2 text-center">
                          {assigned ? (
                            <span className={`inline-block w-4 h-4 rounded-full ${palette[idx % palette.length].split(' ')[0]} border`} title={`Assigned to ${a.username}`}></span>
                          ) : (
                            <span className="inline-block w-4 h-4 rounded-full bg-gray-200" title="Not assigned"></span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && viewMode === 'mapping ' && (
          <div className="overflow-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-supergreen text-supercream">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Batch</th>
                  {admins.map(a => (
                    <th key={a.adminId} className="px-2 py-2 font-semibold">{a.username}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapping .rows.map(r => (
                  <tr key={r.batchId} className="odd:bg-white even:bg-slate-50">
                    <td className="px-2 py-1 whitespace-nowrap">
                      <div className="flex flex-col"><span className="font-medium">{r.batchName}</span><span className="text-[10px] opacity-60">{r.batchId} · {r.deptId}</span></div>
                    </td>
                    {r.values.map((v: number, ci: number) => {
                      const adminId = mapping .admins[ci];
                      const assigned = v === 1;
                      return (
                        <td key={ci} className="px-2 py-1 text-center">
                          <button
                            onClick={async () => {
                              try {
                                if (!data) return;
                                if (!assigned) {
                                  if (!confirm(`Assign admin ${adminId} to batch ${r.batchId}?`)) return;
                                  setMutating(true);
                                  await batchAPI.assignAdmin(r.batchId, adminId);
                                } else {
                                  const choice = prompt(`Reassign batch ${r.batchId}. Enter new adminId or leave blank to unassign.`,'');
                                  if (choice === null) return; // cancelled
                                  setMutating(true);
                                  const trimmed = choice.trim();
                                  if (trimmed === '') {
                                    if (!confirm('Confirm unassign?')) { setMutating(false); return; }
                                    await batchAPI.unassignAdmin(r.batchId);
                                  } else {
                                    const target = adminsAll.find(a => a.adminId === trimmed);
                                    if (!target) { alert('AdminId not found'); setMutating(false); return; }
                                    await batchAPI.assignAdmin(r.batchId, trimmed);
                                  }
                                }
                                const refreshed = await mappingAPI.getAdminBatchMapping();
                                setData(refreshed);
                              } catch (e: any) {
                                alert(e.message || 'Update failed');
                              } finally {
                                setMutating(false);
                              }
                            }}
                            className={`w-6 h-6 rounded ${assigned ? 'bg-violet-500 hover:bg-violet-600' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center text-[10px] font-semibold text-violet-950`}
                            title={assigned ? `Assigned to ${adminsAll.find(a=>a.adminId===adminId)?.username||adminId}` : 'Click to assign'}
                          >
                            {assigned ? '✓' : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && viewMode === 'graph' && data && (
          <div className="border rounded-lg p-4 bg-white">
            <h3 className="text-sm font-bold mb-2 text-supergreenDark">Admin-Batch Relationship Graph</h3>
            <div style={{ height: 500 }}>
              <ForceGraph2D
                graphData={(function(){
                  const nodes:any[]=[]; const links:any[]=[];
                  const adminVisible = adminsAll.filter(a=>!adminFilterLower || a.username.toLowerCase().includes(adminFilterLower));
                  const batchSet = new Set<string>();
                  for(const a of adminVisible){
                    nodes.push({ id: `A:${a.adminId}`, name: a.username, type:'admin'});
                    for(const b of a.batches){
                      if(!deptFilterLower || (b.deptId||'').toLowerCase().includes(deptFilterLower)){ if(!batchSet.has(b.batchId)){ nodes.push({ id:`B:${b.batchId}`, name:b.batchName, type:'batch', dept:b.deptId}); batchSet.add(b.batchId);} links.push({ source:`A:${a.adminId}`, target:`B:${b.batchId}`}); }
                    }
                  }
                  for(const b of unassignedAll){ if(!deptFilterLower || (b.deptId||'').toLowerCase().includes(deptFilterLower)){ if(!batchSet.has(b.batchId)){ nodes.push({ id:`B:${b.batchId}`, name:b.batchName, type:'batch', dept:b.deptId, unassigned:true}); batchSet.add(b.batchId);} }
                  }
                  return { nodes, links };
                })()}
                nodeCanvasObject={(node, ctx, globalScale)=>{
                  const label = node.name as string;
                  const fontSize = 10/globalScale;
                  ctx.beginPath();
                  ctx.arc(node.x!, node.y!, node.type==='admin'?10:8,0,2*Math.PI,false);
                  ctx.fillStyle = node.type==='admin' ? '#7c3aed' : (node.unassigned? '#a78bfa':'#c4b5fd');
                  ctx.fill();
                  ctx.font = `${fontSize}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
                  ctx.fillStyle='#fff'; ctx.fillText(label,node.x!, node.y!);
                }}
                linkColor={()=>'#64748b'}
                cooldownTicks={100}
                onNodeClick={n=>{
                  if(String(n.id).startsWith('B:')){
                    const batchId = String(n.id).slice(2);
                    alert(`Batch ${batchId}\nDept: ${(n as any).dept || 'N/A'}\nUnassigned: ${(n as any).unassigned?'Yes':'No'}`);
                  } else if(String(n.id).startsWith('A:')){
                    const adminId = String(n.id).slice(2);
                    alert(`Admin ${adminId}`);
                  }
                }}
              />
            </div>
          </div>
        )}

        {!loading && !error && viewMode === 'dept' && (
          <div className="space-y-6">
            {deptGrouping.map(g => (
              <div key={g.deptId} className="border rounded-lg p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-supergreenDark">Department: {g.deptId}</h3>
                  <span className="text-xs opacity-70">{g.batches.length} batches</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {g.batches.map(b => (
                    <span key={b.batchId} className="px-2 py-1 rounded bg-supergreenAccent/20 text-supergreenDark text-xs border border-supergreenAccent/40">{b.batchName}<span className="opacity-50 ml-1">({b.batchId})</span></span>
                  ))}
                </div>
                <div className="text-xs text-supergreenDark/70">Admins involved: {g.admins.length ? g.admins.join(', ') : '—'}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && viewMode === 'summary' && (
          <div className="bg-white border rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-bold mb-2 text-supergreenDark">Batch Ownership Summary</h3>
            {summaryData.length === 0 && <div className="text-xs opacity-70">No admins found.</div>}
            {summaryData.length > 0 && (
              <div className="h-64"><canvas ref={summaryChartRef} /></div>
            )}
            <ul className="mt-3 text-xs space-y-1">
              {summaryData.map(d => (
                <li key={d.label} className="flex justify-between"><span>{d.label}</span><span className="font-semibold">{d.value} batches</span></li>
              ))}
            </ul>
          </div>
        )}

        {!loading && !error && unassigned.length > 0 && viewMode === 'cards' && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Unassigned Batches</h2>
            <div className="flex flex-wrap gap-2">
              {unassigned.map(b => (
                <div key={b.batchId} className="px-3 py-2 rounded-md bg-yellow-100 border border-yellow-300 text-yellow-900 text-xs shadow-sm">
                  <span className="font-medium">{b.batchName}</span>
                  <span className="ml-1 opacity-70">({b.batchId})</span>
                  <span className="ml-1 text-[10px] opacity-50">{b.deptId}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SuperAdminFooter />
    </div>
  );
}