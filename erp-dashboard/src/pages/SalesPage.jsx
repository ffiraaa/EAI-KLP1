import { useEffect, useState } from 'react';
import { Plus, Search, ChevronUp, ChevronDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Dialog from '../components/Dialog';
import { getPosTransactions, createTransaction } from '../services/api';

const PM_OPTIONS = ['cash', 'transfer', 'card', 'qris'];

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="text-gray-300">↕</span>;
  return sortDir === 'asc' ? <ChevronUp size={13} className="text-blue-500" /> : <ChevronDown size={13} className="text-blue-500" />;
}

export default function SalesPage() {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: '', customer_name: '', items: [{ product_name: '', price: '', quantity: 1 }], payment_method: 'cash' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await getPosTransactions();
      setTxs(res.data.data || []);
    } catch { setTxs([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const filtered = txs
    .filter(t =>
      t.id?.toLowerCase().includes(search.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.payment_method?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  async function handleSubmit() {
    setError('');
    const items = form.items.filter(i => i.product_name && i.price && i.quantity);
    if (!items.length) { setError('Add at least one product.'); return; }
    setSaving(true);
    try {
      const payload = {
        customer_id: form.customer_id || 'GUEST',
        customer_name: form.customer_name || 'Guest',
        payment_method: form.payment_method,
        items: items.map(i => ({ product_name: i.product_name, price: Number(i.price), quantity: Number(i.quantity) }))
      };
      await createTransaction(payload);
      setOpen(false);
      setForm({ customer_id: '', customer_name: '', items: [{ product_name: '', price: '', quantity: 1 }], payment_method: 'cash' });
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create transaction.');
    } finally { setSaving(false); }
  }

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { product_name: '', price: '', quantity: 1 }] })); }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }
  function updateItem(i, key, val) { setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it) })); }

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Point of sale transactions"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setOpen(true)}>
            <Plus size={15} /> New Transaction
          </button>
        }
      />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} results</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {[['id', 'Transaction ID'], ['customer_name', 'Customer'], ['total_amount', 'Amount'], ['payment_method', 'Payment'], ['created_at', 'Date']].map(([field, label]) => (
                  <th key={field} onClick={() => handleSort(field)} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none">
                    <span className="flex items-center gap-1">{label} <SortIcon field={field} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {[...Array(5)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No transactions found</td></tr>
              ) : paged.map(t => (
                <tr key={t.id} className="table-row">
                  <td className="px-4 py-3 text-xs font-mono text-blue-600">{t.id?.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{t.customer_name}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rp {t.total_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-blue-50 text-blue-700 capitalize">{t.payment_method}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* New Transaction Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} title="New Transaction"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create Transaction'}</button>
        </>}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Customer ID</span>
              <input value={form.customer_id} onChange={e => setForm(f => ({...f, customer_id: e.target.value}))} placeholder="C001 (optional)" className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Customer Name</span>
              <input value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))} placeholder="Guest" className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Payment Method</span>
            <select value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))} className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white">
              {PM_OPTIONS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </label>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Products</span>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="Product name" className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <input value={item.price} onChange={e => updateItem(i, 'price', e.target.value)} placeholder="Price" type="number" className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <input value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" type="number" min="1" className="w-16 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1">×</button>}
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
