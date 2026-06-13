import { useEffect, useState } from 'react';
import { Search, Code2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getJournals, getJournalXml } from '../services/api';

function highlightXml(xml) {
  return xml
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(&lt;\/?)([\w:]+)(&gt;)/g, '<span class="text-blue-400">$1</span><span class="text-emerald-400">$2</span><span class="text-blue-400">$3</span>')
    .replace(/\n/g, '<br/>')
    .replace(/^( +)/gm, m => '&nbsp;'.repeat(m.length));
}

export default function AccountingPage() {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [xmlModal, setXmlModal] = useState(false);
  const [xmlContent, setXmlContent] = useState('');
  const [xmlLoading, setXmlLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await getJournals();
        setJournals(res.data.data || []);
      } catch { setJournals([]); } finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = journals.filter(j =>
    j.description?.toLowerCase().includes(search.toLowerCase()) ||
    j.debit_account?.toLowerCase().includes(search.toLowerCase()) ||
    j.credit_account?.toLowerCase().includes(search.toLowerCase())
  );

  async function viewXml(id) {
    setXmlModal(true); setXmlLoading(true); setXmlContent('');
    try {
      const res = await getJournalXml(id);
      setXmlContent(typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2));
    } catch {
      setXmlContent('<!-- Failed to load XML -->');
    } finally { setXmlLoading(false); }
  }

  return (
    <div>
      <PageHeader title="Accounting" subtitle="Journal entries and ledger" />

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search journals..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <span className="text-xs text-gray-400">{filtered.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Description', 'Debit Account', 'Credit Account', 'Amount', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {[...Array(6)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No journal entries found</td></tr>
              ) : filtered.map(j => (
                <tr key={j.id} className="table-row">
                  <td className="px-4 py-3 text-sm text-gray-500">{j.entry_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{j.description}</td>
                  <td className="px-4 py-3"><span className="badge bg-emerald-50 text-emerald-700">{j.debit_account}</span></td>
                  <td className="px-4 py-3"><span className="badge bg-orange-50 text-orange-700">{j.credit_account}</span></td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rp {j.amount?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => viewXml(j.id)} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                      <Code2 size={13} /> View XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* XML Modal */}
      {xmlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setXmlModal(false)} />
          <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-emerald-400" />
                <span className="text-sm font-medium text-gray-200">Journal Entry XML</span>
              </div>
              <button onClick={() => setXmlModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors">
                <X size={15} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 overflow-auto flex-1">
              {xmlLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-800 rounded animate-pulse" />)}
                </div>
              ) : (
                <pre className="text-xs font-mono text-gray-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: highlightXml(xmlContent) }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
