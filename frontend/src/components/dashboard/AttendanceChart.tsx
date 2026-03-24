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

const data = [
  { day: 'Mon', attendance: 850 },
  { day: 'Tue', attendance: 920 },
  { day: 'Wed', attendance: 880 },
  { day: 'Thu', attendance: 954 },
  { day: 'Fri', attendance: 890 },
  { day: 'Sat', attendance: 420 },
  { day: 'Sun', attendance: 380 },
];

export default function AttendanceChart() {
  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#fff'
            }}
            itemStyle={{ color: '#6366f1' }}
          />
          <Area 
            type="monotone" 
            dataKey="attendance" 
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorAttendance)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
