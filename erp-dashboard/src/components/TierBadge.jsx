const tierConfig = {
  bronze: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  silver: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  platinum: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export default function TierBadge({ tier }) {
  const config = tierConfig[tier?.toLowerCase()] || tierConfig.bronze;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {tier?.charAt(0).toUpperCase() + tier?.slice(1)}
    </span>
  );
}
