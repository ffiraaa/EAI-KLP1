import { useEffect, useState } from 'react';
import { Search, PackagePlus, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Dialog from '../components/Dialog';
import { getInventoryProducts, restockProduct } from '../services/api';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await getInventoryProducts();
      setProducts(res.data.data || []);
    } catch { setProducts([]); } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.toLowerCase().includes(search.toLowerCase())
  );

  function openRestock(p) {
    setTarget(p); setQty(''); setNote(''); setError(''); setOpen(true);
  }

  async function handleRestock() {
    if (!qty || Number(qty) <= 0) { setError('Enter a valid quantity.'); return; }
    setSaving(true); setError('');
    try {
      await restockProduct(target.id, { quantity: Number(qty), note });
      setOpen(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to restock.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Manage products and stock levels" />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} products</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Product ID', 'Product Name', 'Category', 'Stock', 'Min Stock', 'Price', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {[...Array(8)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No products found</td></tr>
              ) : filtered.map(p => {
                const low = p.stock < p.min_stock;
                return (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{p.stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.min_stock}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {low ? (
                        <span className="badge bg-red-50 text-red-600 flex items-center gap-1 w-fit"><AlertTriangle size={11}/> Low Stock</span>
                      ) : (
                        <span className="badge bg-emerald-50 text-emerald-600 w-fit">In Stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openRestock(p)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                        <PackagePlus size={13} /> Restock
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Restock — ${target?.name || ''}`}
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleRestock} disabled={saving}>{saving ? 'Saving…' : 'Restock'}</button>
        </>}
      >
        <div className="space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 flex justify-between">
            <span>Current Stock</span>
            <span className="font-semibold text-gray-900">{target?.stock}</span>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Quantity to Add</span>
            <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="1" placeholder="e.g. 50" className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500">Note</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Optional note..." className="mt-1 w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none" />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
