import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line
  } from 'recharts';
  
  interface DashboardChartsProps {
    trends: { range: string; created: number; resolved: number }[];
    summary: {
      last7Days: { created: number; resolved: number };
      last30Days: { created: number; resolved: number };
      last90Days: { created: number; resolved: number };
    };
  }
  
  const COLORS = ['#8884d8', '#82ca9d'];
  
  const DashboardCharts: React.FC<DashboardChartsProps> = ({ trends, summary }) => {
    const pieData = (range: 'last7Days' | 'last30Days' | 'last90Days') => [
      { name: 'Created', value: summary[range].created },
      { name: 'Resolved', value: summary[range].resolved },
    ];
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Bar Chart - 7 Days */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2">Bar Chart - Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[summary.last7Days]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" hide />
              <YAxis />
              <Tooltip />
              <Bar dataKey="created" fill="#8884d8" name="Created" />
              <Bar dataKey="resolved" fill="#82ca9d" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </div>
  
        {/* Pie Chart - 30 Days */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2">Pie Chart - Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData('last30Days')}
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
                dataKey="value"
              >
                {pieData('last30Days').map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
  
        {/* Pie Chart - 90 Days */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-md font-semibold mb-2">Pie Chart - Last 90 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData('last90Days')}
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
                dataKey="value"
              >
                {pieData('last90Days').map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
  
        {/* Line Chart Trend
        <div className="bg-white p-4 rounded shadow col-span-full">
          <h3 className="text-md font-semibold mb-2">Trend Line (7d/30d/90d)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="created" stroke="#8884d8" />
              <Line type="monotone" dataKey="resolved" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </div> */}
      </div>
    );
  };
  
  export default DashboardCharts;
  