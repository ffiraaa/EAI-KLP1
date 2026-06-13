import Sidebar from '../components/Sidebar';
import TopNav from '../components/TopNav';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopNav />
      <main className="ml-60 pt-16 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
