import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Ticket,
  CheckCircle2,
  CalendarX,
  Ban,
  BadgePercent,
  Layers,
  Plus,
  History as HistoryIcon,
  Network,
  BarChart3,
  Zap,
} from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { usageByDay, topCoupons, statusDistribution } from '../utils/analytics.js';
import { STATUS_COLORS } from '../data/constants.js';
import { timeAgo } from '../utils/dates.js';

const tooltipStyle = { borderRadius: 12, border: '1px solid #e4e8f4', boxShadow: '0 8px 24px rgba(15,23,64,.1)' };

export default function Dashboard() {
  const { store, version } = useCouponStore();
  const navigate = useNavigate();

  const data = useMemo(() => {
    const coupons = store.listCoupons();
    const history = store.listHistory();
    return {
      stats: store.computeStats(),
      daily: usageByDay(history, 7),
      recent: history.slice(0, 6),
      top: topCoupons(coupons, 5),
      statuses: statusDistribution(coupons),
    };
  }, [store, version]);

  const { stats, daily, recent, top, statuses } = data;
  const maxUsed = top.length ? Math.max(1, top[0].usedCount) : 1;

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Live overview of every coupon, powered by a HashMap and a Deque.">
        <button className="btn btn-ghost" onClick={() => navigate('/coupons?new=1')}>
          <Plus size={17} /> Add coupon
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/apply')}>
          <BadgePercent size={17} /> Apply coupon
        </button>
      </PageHeader>

      <div className="stat-grid">
        <StatCard icon={Ticket} label="Total Coupons" value={stats.total} hint="Keys stored in the HashMap" tone="violet" />
        <StatCard icon={CheckCircle2} label="Active Coupons" value={stats.active} hint="Valid and redeemable now" tone="green" />
        <StatCard icon={CalendarX} label="Expired Coupons" value={stats.expired} hint="Past their expiry date" tone="red" />
        <StatCard icon={Ban} label="Exhausted Coupons" value={stats.exhausted} hint="Usage limit reached" tone="amber" />
        <StatCard icon={Zap} label="Successful Applications" value={stats.applications} hint="Across all coupons" tone="blue" />
        <StatCard icon={Layers} label="Total Remaining Uses" value={stats.remaining} hint="Across active coupons" tone="navy" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Coupon usage analytics</div>
              <div className="card-sub">Successful applications per day (last 7 days, from the Deque)</div>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D4AFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6D4AFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecf6" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64708f' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64708f' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke="#6D4AFF"
                  strokeWidth={3}
                  fill="url(#usageFill)"
                  dot={{ r: 4, fill: '#6D4AFF', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Coupon status distribution</div>
          </div>
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statuses.filter((s) => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="none"
                >
                  {statuses
                    .filter((s) => s.value > 0)
                    .map((s) => (
                      <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                    ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <b>{stats.total}</b>
              <span>coupons</span>
            </div>
          </div>
          <div className="legend">
            {statuses.map((s) => (
              <div className="legend-row" key={s.key}>
                <span className="legend-dot" style={{ background: STATUS_COLORS[s.key] }} />
                {s.name}
                <b>{s.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Recent coupon activity</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
              View all
            </button>
          </div>
          {recent.length === 0 ? (
            <div className="empty" style={{ padding: '24px 0' }}>
              <HistoryIcon size={30} />
              <p>No applications yet.</p>
            </div>
          ) : (
            <div className="list">
              {recent.map((r) => (
                <div className="list-item" key={r.id}>
                  <div className="dot-ok">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="list-main">
                    <div className="list-title">{r.code}</div>
                    <div className="list-sub">
                      {r.discountPercent}% off · use #{r.usageNumber}
                    </div>
                  </div>
                  <span className="cell-sub">{timeAgo(r.appliedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Most frequently used</div>
          </div>
          <div className="list">
            {top.map((c, i) => (
              <div className="list-item" key={c.code}>
                <div className="rank">{i + 1}</div>
                <div className="list-main">
                  <div className="list-title">{c.code}</div>
                  <div className="progress" style={{ marginTop: 6 }}>
                    <span style={{ width: `${(c.usedCount / maxUsed) * 100}%` }} />
                  </div>
                </div>
                <b className="num">{c.usedCount}</b>
              </div>
            ))}
            {top.length === 0 && <p className="cell-sub">No coupons yet.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Quick actions</div>
          </div>
          <div className="quick-grid">
            <button className="quick" onClick={() => navigate('/apply')}>
              <span className="qi tone-violet">
                <BadgePercent size={19} />
              </span>
              Apply coupon
              <small>Redeem a code</small>
            </button>
            <button className="quick" onClick={() => navigate('/coupons?new=1')}>
              <span className="qi tone-green">
                <Plus size={19} />
              </span>
              New coupon
              <small>Insert into HashMap</small>
            </button>
            <button className="quick" onClick={() => navigate('/history')}>
              <span className="qi tone-blue">
                <HistoryIcon size={19} />
              </span>
              History
              <small>Deque records</small>
            </button>
            <button className="quick" onClick={() => navigate('/dsa')}>
              <span className="qi tone-amber">
                <Network size={19} />
              </span>
              DSA lab
              <small>See the structures</small>
            </button>
            <button className="quick" onClick={() => navigate('/analytics')}>
              <span className="qi tone-navy">
                <BarChart3 size={19} />
              </span>
              Analytics
              <small>Charts & trends</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
