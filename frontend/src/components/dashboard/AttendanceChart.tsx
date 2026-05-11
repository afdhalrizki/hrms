'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const defaultData = [
  { day: 'Mon', attendance: 0 },
  { day: 'Tue', attendance: 0 },
  { day: 'Wed', attendance: 0 },
  { day: 'Thu', attendance: 0 },
  { day: 'Fri', attendance: 0 },
  { day: 'Sat', attendance: 0 },
  { day: 'Sun', attendance: 0 },
];

export default function AttendanceChart({ data = defaultData }: { data?: any[] }) {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#588157" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#588157" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.03)" />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
          />
          <Tooltip 
            cursor={{ stroke: 'rgba(88, 129, 87, 0.2)', strokeWidth: 2 }}
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.8)', 
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              fontSize: '11px',
              fontWeight: '900',
              padding: '12px 16px',
              textTransform: 'uppercase'
            }}
            itemStyle={{ color: '#a3b18a', padding: 0 }}
          />
          <Area 
            type="monotone" 
            dataKey="attendance" 
            stroke="#588157" 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorAttendance)" 
            filter="url(#glow)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
