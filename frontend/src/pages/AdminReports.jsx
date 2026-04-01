import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const STATUS_COLORS = {
  open: '#eab308',
  in_progress: '#3b82f6',
  resolved: '#22c55e',
  closed: '#6b7280',
};

const CATEGORY_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
      <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function AdminReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, token, logout } = useAuth();

  useEffect(() => {
    axios
      .get('http://localhost:5000/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const totalTickets = data
    ? data.byStatus.reduce((sum, s) => sum + s.count, 0)
    : 0;

  const avgHours = data?.avgResolutionHours;
  const avgDisplay =
    avgHours == null
      ? 'N/A'
      : avgHours < 24
      ? `${avgHours}h`
      : `${(avgHours / 24).toFixed(1)}d`;

  const pieData = data?.byStatus.map((s) => ({
    name: s.status.replace('_', ' '),
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}</span>
        <button
          onClick={() => window.location.href = '/admin'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Users
        </button>
        <button
          onClick={() => window.location.href = '/dispatcher'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Dispatcher
        </button>
        <button
          onClick={() => window.location.href = '/profile'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Profile
        </button>
        <button
          onClick={handleLogout}
          className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </Navbar>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Reports</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : data && (
          <div className="space-y-6">
            {/* Summary stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Tickets" value={totalTickets} />
              <StatCard
                label="Open"
                value={data.byStatus.find((s) => s.status === 'open')?.count ?? 0}
              />
              <StatCard
                label="In Progress"
                value={data.byStatus.find((s) => s.status === 'in_progress')?.count ?? 0}
              />
              <StatCard label="Avg Resolution Time" value={avgDisplay} />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Tickets by Category">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.byCategory} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis
                      dataKey="category"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      tickFormatter={(v) => v.replace('_', ' ')}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [value, 'Tickets']}
                      labelFormatter={(label) => label.replace('_', ' ')}
                      contentStyle={{ fontSize: 13 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {data.byCategory.map((entry, i) => (
                        <Cell key={entry.category} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="Tickets by Status">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Tickets']} contentStyle={{ fontSize: 13 }} />
                    <Legend formatter={(value) => value} />
                  </PieChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Tickets per day */}
            <SectionCard title="Tickets Opened — Last 30 Days">
              {data.perDay.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">No ticket data in the last 30 days</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.perDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [value, 'Tickets']}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString();
                      }}
                      contentStyle={{ fontSize: 13 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminReports;
