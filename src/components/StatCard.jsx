export default function StatCard({ icon: Icon, label, value, hint, tone = 'violet' }) {
  return (
    <div className="card stat-card hoverable">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value num">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}
