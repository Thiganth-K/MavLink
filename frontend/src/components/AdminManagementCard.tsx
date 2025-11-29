 

interface Props {
  onClick: () => void;
}

export default function AdminManagementCard({ onClick }: Props) {
  return (
    <button
      onClick={() => {
        if (onClick) onClick();
        window.location.href = '/super-admin/adminManagement';
      }}
      className="group relative overflow-hidden text-left bg-white rounded-xl shadow-xl border border-supergreenDark/30 hover:shadow-2xl hover:border-supergreenAccent transition p-6 animate-fadeSlide"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="h-12 w-12 rounded-lg bg-supercream text-supergreen flex items-center justify-center font-bold group-hover:scale-105 transition">AM</div>
        <div>
          <h3 className="text-lg font-bold text-supergreenDark underline-animate">Admin Management</h3>
          <p className="text-sm text-supergreen/80 mt-1">Create, update and assign administrators to batches</p>
        </div>
      </div>
      <div className="mt-2 text-xs text-supergreenDark/60 leading-relaxed">
        Central hub for administering platform access and batch ownership. Ensure each batch has a responsible admin for attendance integrity.
      </div>
    </button>
  );
}