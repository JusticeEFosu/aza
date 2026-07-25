"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsChartClient({ data }: { data: any[] }) {
  return (
    <div style={{ width: '100%', height: '300px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#004e34" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#004e34" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#3f4943', fontSize: 12, fontFamily: 'Inter' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#3f4943', fontSize: 12, fontFamily: 'Inter' }} 
            tickFormatter={(value: any) => `₦${((value || 0) / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#E2E8F0', borderRadius: '8px', color: '#0b1c30', fontFamily: 'Inter' }}
            itemStyle={{ color: '#004e34', fontWeight: 600 }}
            formatter={(value: any) => [`₦${(value || 0).toLocaleString()}`, 'Revenue']}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#004e34" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            activeDot={{ r: 6, fill: '#004e34', stroke: '#ffffff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
