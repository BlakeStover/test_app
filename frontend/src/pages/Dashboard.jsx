import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user, token, logout } = useAuth();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tickets/my-tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data);
      } catch {
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [token]);

  const displayed = filterStatus === 'all' ? tickets : tickets.filter((t) => t.status === filterStatus);

  const statCards = [
    { label: 'Total', value: tickets.length, status: 'all' },
    { label: 'Open', value: tickets.filter((t) => t.status === 'open').length, status: 'open' },
    { label: 'In Progress', value: tickets.filter((t) => t.status === 'in_progress').length, status: 'in_progress' },
    { label: 'Resolved', value: tickets.filter((t) => t.status === 'resolved').length, status: 'resolved' },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const statusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const priorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Campus Ticket System</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
          <button
            onClick={() => window.location.href = '/profile'}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Profile
          </button>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Requests</h2>
          <button
            onClick={() => window.location.href = '/new-ticket'}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Request
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {!loading && tickets.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statCards.map(({ label, value, status }) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status === 'all' ? 'all' : filterStatus === status ? 'all' : status)}
                className={`bg-white rounded-2xl shadow-sm p-4 text-left transition-all hover:shadow-md ${filterStatus === status && status !== 'all' ? 'ring-2 ring-blue-500' : ''}`}
              >
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">No requests yet</p>
            <p className="text-gray-400 text-sm mt-1">Click the button above to submit your first request</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">No {filterStatus.replace('_', ' ')} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map((ticket) => (
              <div
                key={ticket.id}
                className="bg-white rounded-2xl shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">#{ticket.id}</span>
                      <h3 className="font-semibold text-gray-800">{ticket.title}</h3>
                    </div>
                    <p className="text-gray-500 text-sm mb-3">{ticket.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{ticket.category}</span>
                      <span>·</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 ml-4">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
