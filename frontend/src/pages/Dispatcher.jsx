import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

function Dispatcher() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [page, setPage] = useState(1);
  const { user, token, logout } = useAuth();

  const PAGE_SIZE = 20;

  const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

  const filtered = [...tickets]
    .filter((t) => filterStatus === 'all' || t.status === filterStatus)
    .filter((t) => filterPriority === 'all' || t.priority === filterPriority)
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'priority_desc') return priorityOrder[b.priority] - priorityOrder[a.priority];
      if (sortBy === 'priority_asc') return priorityOrder[a.priority] - priorityOrder[b.priority];
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterPriority, filterCategory, sortBy]);

  useEffect(() => {
    const getTickets = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data);
      } catch {
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    getTickets();

    const socket = io('http://localhost:5000');
    socket.on('ticket_created', (newTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
    });
    socket.on('ticket_updated', (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      );
    });
    return () => socket.disconnect();
  }, [token]);

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      await axios.put(
        `http://localhost:5000/api/tickets/${ticketId}`,
        { status: newStatus, assigned_to: ticket.assigned_to, priority: ticket.priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      setError('Failed to update ticket');
    }
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

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const selectClass = "text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Campus Ticket System</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Dispatcher Dashboard</h2>
          <span className="text-sm text-gray-500">
            {filtered.length} of {tickets.length} tickets
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="priority_desc">Priority: high to low</option>
              <option value="priority_asc">Priority: low to high</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Priority</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectClass}>
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={selectClass}>
              <option value="all">All categories</option>
              <option value="maintenance">Maintenance</option>
              <option value="campus_safety">Campus Safety</option>
              <option value="it">IT Support</option>
              <option value="cleaning">Cleaning</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            onClick={() => { setSortBy('date_desc'); setFilterStatus('all'); setFilterPriority('all'); setFilterCategory('all'); setPage(1); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline ml-auto"
          >
            Clear filters
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">No tickets match your filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Ticket #</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Summary</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Opened By</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Assigned To</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Created</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
                  >
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500 font-mono">#{ticket.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{ticket.title}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{ticket.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{ticket.submitted_by_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.assigned_to_name
                        ? <span className="text-sm text-gray-700">{ticket.assigned_to_name}</span>
                        : <span className="text-sm text-gray-400">—</span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        className={`text-xs font-medium px-3 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${statusColor(ticket.status)}`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                  className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dispatcher;
