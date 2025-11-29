//import React from 'react';
import BatchViewer from './BatchViewer';

export default function ViewBatchesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-supercream to-violet-200 pt-8 px-6 pb-4">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-supergreenDark">View Batches</h1>
          <button
            onClick={() => { window.location.pathname = '/super-admin'; }}
            className="ml-4 px-3 py-2 bg-white border border-supergreenDark/30 rounded-lg text-purple-950 transition"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="bg-transparent">
          <BatchViewer />
        </div>
      </div>
    </div>
  );
}
