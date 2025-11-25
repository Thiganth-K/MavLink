import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { batchAPI, type Batch } from '../services/api';

interface Props {
  onClose: () => void;
}

export default function BatchViewer({ onClose }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

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
          <button onClick={load} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors">Refresh</button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-violet-200 shadow animate-pulse p-5">
              <div className="h-6 w-32 bg-violet-100 rounded mb-3" />
              <div className="h-4 w-24 bg-violet-100 rounded mb-5" />
              <div className="h-4 w-40 bg-violet-100 rounded" />
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 text-violet-800 text-center">No batches found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(batch => {
            const expanded = expandedBatchId === batch._id;
            return (
              <div key={batch._id} className="bg-white rounded-xl border border-violet-200 shadow hover:shadow-lg transition p-5 flex flex-col">
                <div className="mb-3">
                  <p className="text-violet-950 font-semibold leading-tight">{batch.batchName}</p>
                  <p className="text-sm text-violet-700">Year: {batch.batchYear}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-violet-100 text-violet-700">
                    {batch.students.length} students
                  </span>
                </div>
                {batch.students.length > 0 && (
                  <button
                    onClick={() => setExpandedBatchId(expanded ? null : batch._id || null)}
                    className="text-xs text-violet-600 hover:underline text-left"
                  >
                    {expanded ? 'Hide students' : 'View students'}
                  </button>
                )}
                {expanded && (
                  <ul className="mt-2 text-xs max-h-48 overflow-auto divide-y">
                    {batch.students.map((s, idx) => (
                      <li key={idx} className="py-1">
                        <span className="font-medium">{s.name}</span> - {s.regno} - {s.dept}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
