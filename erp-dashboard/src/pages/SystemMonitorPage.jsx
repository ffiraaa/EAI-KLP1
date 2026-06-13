import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Server, CheckCircle2, XCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getHealth } from '../services/api';

const SERVICE_LABELS = {
  pos: 'Point of Sale',
  inventory: 'Inventory',
  accounting: 'Accounting',
  ecommerce: 'E-Commerce',
  crm: 'CRM',
};

export default function SystemMonitorPage() {
  const [health, setHealth] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHealth();
      setHealth(res.data);
    } catch {
      setHealth({ gateway: 'error', services: {} });
    } finally {
      setLastChecked(new Date());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const services = [
    { key: 'gateway', label: 'API Gateway', status: health?.gateway },
    ...Object.entries(health?.services || {}).map(([key, status]) => ({ key, label: SERVICE_LABELS[key] || key, status })),
  ];

  return (
    <div>
      <PageHeader
        title="System Monitor"
        subtitle="Real-time microservice health status"
        action={
          <button onClick={fetchHealth} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {lastChecked && (
        <p className="text-xs text-gray-400 mb-4">
          Last checked: {lastChecked.toLocaleTimeString()} · Auto-refreshes every 30 seconds
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && !health ? (
          [...Array(6)].map((_, i) => <div key={i} className="card p-5 h-32 animate-pulse" />)
        ) : services.map(({ key, label, status }) => {
          const ok = status === 'ok';
          return (
            <div key={key} className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  <Server size={18} className={ok ? 'text-emerald-600' : 'text-red-500'} />
                </div>
                {ok ? <CheckCircle2 size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-red-400" />}
              </div>
              <p className="text-sm font-semibold text-gray-800">{label}</p>
              <p className={`text-xs font-medium mt-1 ${ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {ok ? 'Healthy' : 'Unreachable'}
              </p>
              <p className="text-[10px] text-gray-400 mt-3 pt-3 border-t border-gray-50">
                Last checked: {lastChecked?.toLocaleTimeString() || '—'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
