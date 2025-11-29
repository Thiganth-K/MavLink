 

interface Props { onClick?: () => void; }

export default function AdminBatchMappingCard({ onClick }: Props) {
  return (
    <button
      onClick={() => {
        onClick && onClick();
        window.location.href = '/super-admin/admin-batch-mapping';
      }}
      className="group relative overflow-hidden text-left bg-white rounded-xl shadow-xl border border-supergreenDark/30 hover:shadow-2xl hover:border-supergreenAccent transition p-6 animate-fadeSlide"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-supercream text-supergreen flex items-center justify-center font-bold group-hover:scale-105 transition">MP</div>
        <div>
          <h3 className="text-lg font-bold text-supergreenDark underline-animate">Admin ↔ Batch Mapping</h3>
          <p className="text-sm text-supergreen/80 mt-1">Visualize admin ownership across batches</p>
        </div>
      </div>
      <div className="mt-2 text-xs text-supergreenDark/60 leading-relaxed">
        Inspect coverage, detect unassigned batches and validate distribution balance before reassignment actions.
      </div>
    </button>
  );
}