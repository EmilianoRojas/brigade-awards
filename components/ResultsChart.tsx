import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { AwardResult } from '../types';

interface ResultsChartProps {
    data: AwardResult[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="label text-white font-bold">{`${label}`}</p>
          <p className="intro text-indigo-400">{`Votes: ${payload[0].value}`}</p>
        </div>
      );
    }
  
    return null;
  };

const ResultsChart: React.FC<ResultsChartProps> = ({ data }) => {

    const sortedData = [...data].sort((a, b) => b.vote_count - a.vote_count);

    return (
        <div className="w-full h-96 bg-gray-800 p-4 rounded-lg">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis 
                        dataKey="full_name" 
                        angle={-25} 
                        textAnchor="end" 
                        height={60}
                        tick={{ fill: '#A0AEC0' }} 
                        interval={0}
                    />
                    <YAxis allowDecimals={false} tick={{ fill: '#A0AEC0' }} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(100, 116, 139, 0.1)'}} />
                    <Bar dataKey="vote_count" name="Votes" fill="#6366F1">
                        {sortedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ResultsChart;
