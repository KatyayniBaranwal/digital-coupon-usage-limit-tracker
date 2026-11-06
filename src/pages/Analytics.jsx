import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Zap, Gauge, Layers, Activity } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { useCouponStore } from '../utils/useCouponStore.js';
import { availability, categoryDistribution, cumulativeByDay, topCoupons, usageByDay } from '../utils/analytics.js';
import { CHART_COLORS } from '../data/constants.js';

const tooltipStyle = { borderRadius: 12, border: '1px solid #e4e8f4', boxShadow: '0 8px 24px rgba(15,23,64,.1)' };
const axis = { fontSize: 12, fill: '#64708f' };

export default function Analytics() {
  const { store, version } = useCouponStore();
  const [range, setRange] = useState(7);

  const d = useMemo(() => {
    const coupons = store.listCoupons();
    const history = store.listHistory();
    const stats = store.computeStats();
    const totalCapacity = coupons.reduce((s, c) => s + c.maxUsage, 0);
    return {
      stats,
      historyCount: history.length,
      utilization: totalCapacity ? Math.round((stats.applications / totalCapacity) * 100) : 0,
      popular: topCoupons(coupons, 8),
      categories: categoryDistribution(coupons),
      avail: availability(coupons, 10),
      history,
    };
  }, [store, version]);

  const daily = useMemo(() => usageByDay(d.history, range), [d.history, range]);
  const cumulative = useMemo(() => cumulativeByDay(d.history, 14), [d.history]);

  return (
    <div className="page">
      <PageHeader title="Analytics" subtitle="Interactive charts built from live coupon data and the history Deque." />

      <div className="stat-grid">
        <StatCard icon={Zap} label="Successful Applications" value={d.stats.applications} hint="All-time, all coupons" tone="violet" />
        <StatCard icon={Gauge} label="Overall Utilisation" value={`${d.utilization}%`} hint="Used / total allowed uses" tone="blue" />
        <StatCard icon={Layers} label="Remaining Availability" value={d.stats.remaining} hint="Uses left on active coupons" tone="green" />
        <StatCard icon={Activity} label="Recent Records" value={d.historyCount} hint="Currently held in the Deque" tone="amber" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Coupon usage over time</div>
              <div className="card-sub">Applications per day, from the history Deque</div>
            </div>
            <select className="select" style={{ width: 'auto' }} value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="anFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D4AFF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6D4AFF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecf6" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="applications" name="Applications" stroke="#6D4AFF" strokeWidth={3} fill="url(#anFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Usage by category</div>
              <div className="card-sub">Share of all successful applications</div>
            </div>
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.categories} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} stroke="none">
                  {d.categories.map((c, i) => (
                    <Cell key={c.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-eq">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Most popular coupons</div>
              <div className="card-sub">Total successful applications per coupon</div>
            </div>
          </div>
          <div className="chart-box tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.popular} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecf6" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={axis} allowDecimals={false} />
                <YAxis type="category" dataKey="code" width={92} tickLine={false} axisLine={false} tick={{ ...axis, fontFamily: 'monospace' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f6f4ff' }} />
                <Bar dataKey="usedCount" name="Applications" radius={[0, 8, 8, 0]} fill="#6D4AFF" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Remaining coupon availability</div>
              <div className="card-sub">Used vs remaining uses (non-expired coupons)</div>
            </div>
          </div>
          <div className="chart-box tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.avail} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecf6" vertical={false} />
                <XAxis dataKey="code" tickLine={false} axisLine={false} tick={{ ...axis, fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={56} />
                <YAxis tickLine={false} axisLine={false} tick={axis} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f6f4ff' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="used" name="Used" stackId="a" fill="#6D4AFF" />
                <Bar dataKey="remaining" name="Remaining" stackId="a" fill="#12B76A" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Successful coupon applications (cumulative)</div>
            <div className="card-sub">Running total of applications recorded in the Deque over the last 14 days</div>
          </div>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumulative} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e9ecf6" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="total" name="Total applications" stroke="#2E90FA" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
