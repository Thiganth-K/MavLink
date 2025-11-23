import React from 'react';

interface Props {
  onClick: () => void;
}

export default function ViewBatchesCard({ onClick }: Props) {
  return (
    <button
      onClick={() => {
        if (onClick) onClick();
      }}
      className="group relative overflow-hidden text-left bg-white rounded-xl shadow-xl border border-supergreenDark/30 hover:shadow-2xl hover:border-supergreenAccent transition p-6 animate-fadeSlide"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-supercream text-supergreen flex items-center justify-center font-bold group-hover:scale-105 transition">VB</div>
        <div>
          <h3 className="text-lg font-bold text-supergreenDark underline-animate">View Batches</h3>
          <p className="text-sm text-supergreen/80 mt-1">Browse and inspect batch compositions</p>
        </div>
      </div>
      <div className="mt-2 text-xs text-supergreenDark/60 leading-relaxed">
        Quickly review batches, their assigned admins and structural metadata. Provides visibility before making assignments.
      </div>
    </button>
  );
}