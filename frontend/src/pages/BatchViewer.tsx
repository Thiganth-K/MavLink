import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { batchAPI, type Batch } from '../services/api';
import BatchStudentDetails from './BatchStudentDetails';

export default function BatchViewer() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setIsLoading(true);
      const data = await batchAPI.getBatches();
      setBatches(data);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load batches');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-violet-950">Available Batches</h2>
        <div className="flex gap-3">
          <button onClick={load} className="px-4 py-2 bg-white text-fuchsia-700 border border-fuchsia-700 rounded-lg hover:bg-fuchsia-50 transition-colors">Refresh</button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow animate-pulse p-5">
              <div className="h-6 w-32 bg-violet-100 rounded mb-3" />
              <div className="h-4 w-24 bg-violet-100 rounded mb-5" />
              <div className="h-4 w-40 bg-violet-100 rounded" />
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-violet-50 border border-black rounded-xl p-6 text-violet-800 text-center">No batches found.</div>
      ) : selectedBatch ? (
        <BatchStudentDetails batch={selectedBatch} onBack={() => setSelectedBatch(null)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(batch => (
            <button
              key={batch._id}
              type="button"
              onClick={() => setSelectedBatch(batch)}
              className="w-full text-left bg-white rounded-xl border-2 border-violet-100 shadow-lg hover:shadow-2xl hover:scale-[1.02] hover:border-violet-400 transition-all duration-300 p-5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base md:text-lg font-bold text-violet-950 truncate mb-1">{batch.batchName}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium">Year: {batch.batchYear}</span>
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium">Batch ID: {batch.batchId}</span>
                    {batch.deptId && (<span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium">Dept: {batch.deptId}</span>)}
                  </div>
                </div>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-violet-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2 py-1 text-xs rounded-full bg-violet-100 text-violet-700 font-medium">{batch.students.length} students</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
