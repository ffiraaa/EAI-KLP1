import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Dialog from '../components/Dialog';
import { getEcomProducts, getEcomOrders, createOrder } from '../services/api';

export default function EcommercePage() {
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: '', customer_name: '', items: [{ product_name: '', quantity: 1 }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [pRes, oRes] = await Promise.allSettled([getEcomProducts(), getEcomOrders()]);
      setProducts(pRes.status === 'fulfilled' ? pRes.value.data.data || [] : []);
      setOrders(oRes.status === 'fulfilled' ? oRes.value.data.data || [] : []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter(o =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.id?.toLowerCase().includes(search.toLowerCase())
  );

  function addItem() { setForm(f => ({...f, items: [...f.items, { product_name: '', quantity: 1 }]})); }
  function removeItem(i) { setForm(f => ({...f, items: f.items.filter((_, idx) => idx !== i)})); }
  function updateItem(i, key, val) { setForm(f => ({...f, items: f.items.map((it, idx) => idx === i ? {...it, [key]: val} : it)})); }

  async function handleSubmit() {
    setError('');
    const items = form.items.filter(i => i.product_name && i.quantity);
    if (!items.length) { setError('Add at least one product.'); return; }
    setSaving(true);
    try {
      await createOrder({
        customer_id: form.customer_id || 'GUEST',
        customer_name: form.customer_name || 'Guest',
        items: items.map(i => ({ product_name: i.product_name, quantity: Number(i.quantity) }))
      });
      setOpen(false);
      setForm({ customer_id: '', customer_name: '', items: [{ product_name: '', quantity: 1 }] });
      setTab('orders');
      load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create order.');
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title="E-Commerce"
        subtitle="Online store products and orders"
        action={
          <button className="btn-primary flex items-center gap-2" onClick={() => setOpen(true)}>
            <Plus size={15} /> Create Order
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white p-1 rounded-xl border border-gray-100 w-fit shadow-card">
        {['products', 'orders'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <span className="text-xs text-gray-400">{tab === 'products' ? filteredProducts.length : filteredOrders.length} results</span>
        </div>

        <div className="overflow-x-auto">
          {tab === 'products' ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Product ID', 'Name', 'Category', 'Price', 'Stock'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
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
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No products found</td></tr>
                ) : filteredProducts.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{p.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Rp {p.price?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Order ID', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
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
                ) : filteredOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No orders found</td></tr>
                ) : filteredOrders.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{o.id?.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{o.customer_name}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rp {o.total_amount?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-blue-50 text-blue-700 capitalize">{o.status || 'pending'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{o.created_at?.slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Create Order"
        footer={<>
          <button className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Create Order'}</button>
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Products</span>
              <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Item</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} placeholder="Product name" className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <input value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" type="number" min="1" className="w-20 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                {form.items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 px-1">×</button>}
              </div>
            ))}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
