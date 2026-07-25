'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

export function RevenueChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#6f7a72', background: '#f8f9ff', borderRadius: '12px', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>
        No revenue data available yet.
      </div>
    );
  }

  // Format Y-axis ticks to Naira
  const formatYAxis = (tickItem: number) => {
    return `₦${(tickItem / 100).toLocaleString()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#ffffff', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6f7a72', fontFamily: 'var(--font-body, Inter, sans-serif)' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#004e34', fontFamily: 'var(--font-heading, Montserrat, sans-serif)' }}>
            ₦{(payload[0].value / 100).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#004e34" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#004e34" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6f7a72', fontSize: 12, fontFamily: 'Inter, sans-serif' }} 
            dy={10} 
          />
          <YAxis 
            tickFormatter={formatYAxis} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6f7a72', fontSize: 12, fontFamily: 'Inter, sans-serif' }} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#004e34" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
