import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-white shadow rounded p-4 flex justify-between items-center">
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <h2 className="text-2xl font-bold">{value}</h2>
      </div>
      {icon && <div className="text-3xl text-gray-400">{icon}</div>}
    </div>
  );
};

export default StatCard;
