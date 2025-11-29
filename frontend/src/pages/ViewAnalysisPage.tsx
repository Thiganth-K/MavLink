import SuperAdminNavbar from '../components/superadminnavbar';
import SuperAdminFooter from '../components/superadminfooter';
import ViewAnalysisCard from '../components/ViewAnalysisCard';

export default function ViewAnalysisPage() {
  return (
    <div className="min-h-screen flex flex-col">
  <SuperAdminNavbar />
  <main className="p-6 bg-gradient-to-br from-supercream to-violet-200 flex-grow">
    <div className="max-w-6xl mx-auto">
      
      {/* Header row */}
      <div className="flex items-center justify-between w-full mb-4">
        <h2 className="text-2xl font-bold text-supergreenDark">View Analysis</h2>
        <button
          onClick={() => { window.location.href = '/super-admin'; }}
          className="px-4 py-2 bg-white border border-supergreenDark/30 text-supergreenDark rounded-lg shadow hover:border-supergreenAccent hover:shadow-md transition-colors"
        >
          ◂ Back to Dashboard
        </button>
      </div>

      <ViewAnalysisCard />
    </div>
  </main>
  <SuperAdminFooter />
</div>

  );
}
