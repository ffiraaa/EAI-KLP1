export default function KpiCard({ title, value, icon: Icon, color, sub, loading }) {
  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', val: 'text-blue-700' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-700' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', val: 'text-orange-700' },
    pink: { bg: 'bg-pink-50', icon: 'text-pink-600', val: 'text-pink-700' },
    teal: { bg: 'bg-teal-50', icon: 'text-teal-600', val: 'text-teal-700' },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          {loading ? (
            <div className="h-7 w-24 bg-gray-100 rounded-lg animate-pulse mt-1" />
          ) : (
            <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
          )}
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <Icon size={20} className={c.icon} />
        </div>
      </div>
    </div>
  );
}
