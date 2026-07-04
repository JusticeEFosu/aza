'use client';

import { useState, useMemo } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsChart({ transactions, formattedMRR }: { transactions: any[], formattedMRR: string }) {
  const [timeRange, setTimeRange] = useState<'30' | '60' | 'all'>('30');

  const data = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    
    let filteredTransactions = [...transactions];
    const now = new Date();

    if (timeRange === '30') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) >= thirtyDaysAgo);
    } else if (timeRange === '60') {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(now.getDate() - 60);
      filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) >= sixtyDaysAgo);
    }

    // Group by Date (YYYY-MM-DD)
    const grouped = filteredTransactions.reduce((acc: any, curr) => {
      const dateStr = new Date(curr.created_at).toISOString().split('T')[0];
      if (!acc[dateStr]) {
        acc[dateStr] = 0;
      }
      acc[dateStr] += (curr.amount / 100); // Convert kobo to Naira
      return acc;
    }, {});

    // Fill in empty days for 30/60 day views so the chart is continuous
    if (timeRange === '30' || timeRange === '60') {
      const days = parseInt(timeRange);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (!grouped[dateStr]) {
          grouped[dateStr] = 0;
        }
      }
    }

    // Convert object to array and sort by date
    const chartData = Object.keys(grouped)
      .sort()
      .map(dateStr => {
        const d = new Date(dateStr);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          earnings: grouped[dateStr]
        };
      });

    return chartData;
  }, [transactions, timeRange]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#fff', border: '1px solid var(--v2-outline)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10 }}>
          <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: 'var(--v2-text-variant)' }}>{label}</p>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--v2-primary)' }}>
            ₦ {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="v2-stat-label">Monthly Recurring Revenue</p>
          <h3 className="v2-stat-value">{formattedMRR}</h3>
        </div>
        
        <select 
          value={timeRange} 
          onChange={(e: any) => setTimeRange(e.target.value)}
          style={{ 
            padding: '4px 8px', 
            borderRadius: '6px', 
            border: '1px solid var(--v2-outline)', 
            background: 'var(--v2-surface-low)', 
            fontSize: '11px', 
            fontWeight: 600,
            color: 'var(--v2-text-variant)', 
            outline: 'none', 
            cursor: 'pointer',
            marginTop: '2px'
          }}
        >
          <option value="30">30d</option>
          <option value="60">60d</option>
          <option value="all">All</option>
        </select>
      </div>
      
      <div style={{ height: '60px', width: '100%', marginTop: 'auto', paddingTop: '16px' }}>
        {data.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'flex-end', color: 'var(--v2-text-variant)', fontSize: '12px', paddingBottom: '4px' }}>
            No recent transactions
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--v2-green)" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="var(--v2-green)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--v2-outline)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area 
                type="monotone" 
                dataKey="earnings" 
                stroke="var(--v2-green)" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorEarnings)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
