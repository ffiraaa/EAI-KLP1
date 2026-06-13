import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import SalesPage from '../pages/SalesPage';
import InventoryPage from '../pages/InventoryPage';
import EcommercePage from '../pages/EcommercePage';
import CrmPage from '../pages/CrmPage';
import AccountingPage from '../pages/AccountingPage';
import ReportsPage from '../pages/ReportsPage';
import SystemMonitorPage from '../pages/SystemMonitorPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'sales', element: <SalesPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'ecommerce', element: <EcommercePage /> },
      { path: 'customers', element: <CrmPage /> },
      { path: 'accounting', element: <AccountingPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'system', element: <SystemMonitorPage /> },
    ],
  },
]);

export default router;
