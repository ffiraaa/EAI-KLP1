import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';
import PageHeader from '../components/PageHeader';
import {
  getPosTransactions, getCustomers, getInventoryProducts, getEcomOrders
} from '../services/api';

const COLORS = ['#F59E0B', '#94A3B8', '#EAB308', '#3B82F6'];
const STATUS_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [revTrend, setRevTrend] = useState([]);
  const [tierDist, setTierDist] = useState([]);
  const [invStatus, setInvStatus] = useState([]);
  const [orderStats, setOrderStats] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [txRes, custRes, invRes, ordRes] = await Promise.allSettled([
          getPosTransactions(), getCustomers(), getInventoryProducts(), getEcomOrders()
        ]);

        const txs = txRes.status === 'fulfilled' ? txRes.value.data.data : [];
        const custs = custRes.status === 'fulfilled' ? custRes.value.data.data : [];
        const prods = invRes.status === 'fulfilled' ? invRes.value.data.data : [];
        const ords = ordRes.status === 'fulfilled' ? ordRes.value.data.data : [];

        // Revenue trend
        const byDate = {};
        txs.forEach(t => {
          const d = t.created_at?.slice(0, 10) || 'Unknown';
          byDate[d] = (byDate[d] || 0) + (t.total_amount || 0);
        });
        setRevTrend(Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date: date.slice(5), revenue })));

        // Tier dist
        const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
        custs.forEach(c => { tiers[c.tier?.toLowerCase()] = (tiers[c.tier?.toLowerCase()] || 0) + 1; });
        setTierDist(Object.entries(tiers).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

        // Inventory status
        setInvStatus(prods.map(p => ({
          name: p.name?.length > 10 ? p.name.slice(0, 10) + '…' : p.name,
          stock: p.stock, min: p.min_stock,
        })));

        // Order stats by status
        const statusCount = {};
        ords.forEach(o => {
          const s = o.status || 'pending';
          statusCount[s] = (statusCount[s] || 0) + 1;
        });
        setOrderStats(Object.entries(statusCount).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));

      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytical overview across all modules" />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Revenue Trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          {loading ? <ChartSkeleton /> : revTrend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => [`Rp ${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Customer Tier Distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Customer Tier Distribution</h3>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={tierDist} cx="50%" cy="45%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {tierDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory Status */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Inventory Status</h3>
          {loading ? <ChartSkeleton /> : invStatus.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={invStatus} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#3B82F6" radius={[4,4,0,0]} name="Stock" />
                <Bar dataKey="min" fill="#FCA5A5" radius={[4,4,0,0]} name="Min Stock" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Statistics */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Order Statistics</h3>
          {loading ? <ChartSkeleton /> : orderStats.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={orderStats} cx="50%" cy="45%" outerRadius={85} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {orderStats.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" />;
}
function Empty() {
  return <p className="text-sm text-gray-400 py-20 text-center">No data available</p>;
}
