import SuperAdminNavbar from '../components/superadminnavbar';
import SuperAdminFooter from '../components/superadminfooter';
import ViewAnalysisCard from '../components/ViewAnalysisCard';

export default function ViewAnalysisPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <SuperAdminNavbar onLogout={() => {}} />
      <main className="p-6 bg-gradient-to-br from-supercream to-green-200 flex-grow">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-supergreenDark mb-4">View Analysis</h2>
          <ViewAnalysisCard />
        </div>
      </main>
      <SuperAdminFooter />
    </div>
  );
}
