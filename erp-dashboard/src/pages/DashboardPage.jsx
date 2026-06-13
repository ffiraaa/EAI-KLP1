import { useEffect, useState } from 'react';
import {
  DollarSign, ShoppingBag, Package, Users,
  Boxes, BookOpen, Server
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import KpiCard from '../components/KpiCard';
import PageHeader from '../components/PageHeader';
import {
  getPosTransactions, getEcomOrders, getCustomers,
  getInventoryProducts, getJournals, getHealth
} from '../services/api';

const COLORS = ['#F59E0B', '#94A3B8', '#EAB308', '#3B82F6'];

function fmt(n) {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}K`;
  return `Rp ${n}`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({});
  const [revTrend, setRevTrend] = useState([]);
  const [tierDist, setTierDist] = useState([]);
  const [invStatus, setInvStatus] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [txRes, ordRes, custRes, invRes, jrnRes, hlthRes] = await Promise.allSettled([
          getPosTransactions(), getEcomOrders(), getCustomers(),
          getInventoryProducts(), getJournals(), getHealth()
        ]);

        const txs = txRes.status === 'fulfilled' ? txRes.value.data.data : [];
        const ords = ordRes.status === 'fulfilled' ? ordRes.value.data.data : [];
        const custs = custRes.status === 'fulfilled' ? custRes.value.data.data : [];
        const prods = invRes.status === 'fulfilled' ? invRes.value.data.data : [];
        const jrns = jrnRes.status === 'fulfilled' ? jrnRes.value.data.data : [];

        // KPIs
        const totalRevenue = txs.reduce((s, t) => s + (t.total_amount || 0), 0);
        setKpi({
          revenue: fmt(totalRevenue),
          transactions: txs.length,
          orders: ords.length,
          customers: custs.length,
          products: prods.length,
          journals: jrns.length,
        });

        // Revenue trend by date
        const byDate = {};
        txs.forEach(t => {
          const d = t.created_at?.slice(0, 10) || 'Unknown';
          byDate[d] = (byDate[d] || 0) + (t.total_amount || 0);
        });
        setRevTrend(
          Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-10)
            .map(([date, revenue]) => ({ date: date.slice(5), revenue }))
        );

        // Tier distribution
        const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
        custs.forEach(c => { tiers[c.tier?.toLowerCase()] = (tiers[c.tier?.toLowerCase()] || 0) + 1; });
        setTierDist(Object.entries(tiers).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

        // Inventory status (top 8 by stock)
        setInvStatus(prods.slice(0, 8).map(p => ({
          name: p.name?.length > 12 ? p.name.slice(0, 12) + '…' : p.name,
          stock: p.stock,
          min: p.min_stock,
        })));

        // Health
        if (hlthRes.status === 'fulfilled') setHealth(hlthRes.value.data);
        else setHealth({ gateway: 'error', services: {} });

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Welcome back, Admin — here's your business overview" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard title="Total Revenue" value={kpi.revenue || '—'} icon={DollarSign} color="blue" loading={loading} />
        <KpiCard title="Transactions" value={kpi.transactions ?? '—'} icon={ShoppingBag} color="green" loading={loading} />
        <KpiCard title="Orders" value={kpi.orders ?? '—'} icon={Package} color="purple" loading={loading} />
        <KpiCard title="Customers" value={kpi.customers ?? '—'} icon={Users} color="orange" loading={loading} />
        <KpiCard title="Products" value={kpi.products ?? '—'} icon={Boxes} color="pink" loading={loading} />
        <KpiCard title="Journals" value={kpi.journals ?? '—'} icon={BookOpen} color="teal" loading={loading} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Revenue Trend */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          {revTrend.length === 0 && !loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">No transaction data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`Rp ${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Customer Tiers</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={tierDist} cx="50%" cy="45%" outerRadius={75} innerRadius={40} dataKey="value" paddingAngle={3}>
                {tierDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Inventory Status */}
        <div className="card p-5 xl:col-span-2">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Inventory Stock Levels</h3>
          {invStatus.length === 0 && !loading ? (
            <p className="text-sm text-gray-400 py-8 text-center">No inventory data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={invStatus} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Stock" />
                <Bar dataKey="min" fill="#FCA5A5" radius={[4, 4, 0, 0]} name="Min Stock" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Service Health */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">Service Health</h3>
            <Server size={14} className="text-gray-400" />
          </div>
          {health ? (
            <div className="space-y-2.5">
              {[
                { name: 'Gateway', status: health.gateway },
                ...Object.entries(health.services || {}).map(([name, status]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), status }))
              ].map(({ name, status }) => (
                <div key={name} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50">
                  <span className="text-sm text-gray-700 font-medium">{name}</span>
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${status === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
                    <span className={`w-2 h-2 rounded-full ${status === 'ok' ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    {status === 'ok' ? 'Healthy' : 'Unreachable'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
