import { useEffect, useState } from 'react';
import { Search, Mail, Phone, Star, History } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Drawer from '../components/Drawer';
import TierBadge from '../components/TierBadge';
import { getCustomers, getCustomer, getCustomerHistory } from '../services/api';

export default function CrmPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getCustomers();
        setCustomers(res.data.data || []);
      } catch { setCustomers([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function openDetail(c) {
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const [dRes, hRes] = await Promise.allSettled([getCustomer(c.id), getCustomerHistory(c.id)]);
      setDetail(dRes.status === 'fulfilled' ? dRes.value.data.data : c);
      setHistory(hRes.status === 'fulfilled' ? hRes.value.data.data || [] : []);
    } finally { setDetailLoading(false); }
  }

  return (
    <div>
      <PageHeader title="CRM" subtitle="Customer relationship management" />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} customers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Customer', 'Tier', 'Loyalty Points', 'Total Spent'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {[...Array(4)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-gray-400">No customers found</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} onClick={() => openDetail(c)} className="table-row cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {c.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400">{c.id}</p>
                        <p className="text-sm font-medium text-gray-800">{c.name}</p>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700 flex items-center gap-1.5">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" /> {c.loyalty_points}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rp {c.total_spent?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Customer Profile">
        {detailLoading || !detail ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {detail.name?.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{detail.name}</h3>
                <TierBadge tier={detail.tier} />
              </div>
            </div>

            {/* Contact */}
            <div className="card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} className="text-gray-400" /> {detail.email}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} className="text-gray-400" /> {detail.phone}</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Loyalty Points</p>
                <p className="text-xl font-bold text-blue-600 flex items-center gap-1.5"><Star size={16} className="fill-yellow-400 text-yellow-400" /> {detail.loyalty_points}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Spent</p>
                <p className="text-xl font-bold text-gray-900">Rp {detail.total_spent?.toLocaleString()}</p>
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><History size={14} /> Spending History</h4>
              {history.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No purchase history yet</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Rp {h.amount?.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{h.created_at?.slice(0, 16)}</p>
                      </div>
                      <span className="badge bg-emerald-50 text-emerald-600">+{h.points_earned} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
