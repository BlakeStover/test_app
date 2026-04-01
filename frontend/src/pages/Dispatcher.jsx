import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Dispatcher() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { user, token, logout } = useAuth();

  const PAGE_SIZE = 20;

  const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };

  const dispatcherStatCards = [
    { label: 'Total', value: tickets.length, key: 'total' },
    { label: 'Open', value: tickets.filter((t) => t.status === 'open').length, key: 'open' },
    { label: 'In Progress', value: tickets.filter((t) => t.status === 'in_progress').length, key: 'in_progress' },
    { label: 'Resolved', value: tickets.filter((t) => t.status === 'resolved').length, key: 'resolved' },
    { label: 'Unassigned', value: tickets.filter((t) => !t.assigned_to).length, key: 'unassigned' },
  ];

  const filtered = [...tickets]
    .filter((t) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(t.id).includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.submitted_by_name?.toLowerCase().includes(q)
      );
    })
    .filter((t) => filterStatus === 'all' || t.status === filterStatus)
    .filter((t) => filterPriority === 'all' || t.priority === filterPriority)
    .filter((t) => filterCategory === 'all' || t.category === filterCategory)
    .filter((t) => !filterUnassigned || !t.assigned_to)
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
  }, [filterStatus, filterPriority, filterCategory, filterUnassigned, sortBy, search]);

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

  const selectClass = 'text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white';

  const clearFilters = () => {
    setSearch('');
    setSortBy('date_desc');
    setFilterStatus('all');
    setFilterPriority('all');
    setFilterCategory('all');
    setFilterUnassigned(false);
    setPage(1);
  };

  const paginationBar = totalPages > 1 && (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-gray-700">
      <button
        onClick={() => setPage((p) => p - 1)}
        disabled={page === 1}
        className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={page === totalPages}
        className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}</span>
        {user?.role === 'admin' && (
          <button
            onClick={() => window.location.href = '/admin'}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
          >
            Admin
          </button>
        )}
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dispatcher Dashboard</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} of {tickets.length} tickets
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {!loading && tickets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
            {dispatcherStatCards.map(({ label, value, key }) => {
              const isActive = key === 'unassigned' ? filterUnassigned : (filterStatus === key && key !== 'total');
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'total') {
                      setFilterStatus('all');
                      setFilterUnassigned(false);
                    } else if (key === 'unassigned') {
                      setFilterUnassigned(!filterUnassigned);
                      setFilterStatus('all');
                    } else {
                      setFilterStatus(filterStatus === key ? 'all' : key);
                      setFilterUnassigned(false);
                    }
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 text-left transition-all hover:shadow-md ${isActive ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by #, title, description, category, submitter…"
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-full sm:w-72"
          />

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="priority_desc">Priority: high to low</option>
              <option value="priority_asc">Priority: low to high</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectClass}>
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
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
            onClick={clearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-auto"
          >
            Clear filters
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-lg">No tickets match your filters</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {paginated.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{ticket.id}</span>
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm mt-0.5 truncate">{ticket.title}</h3>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="ml-3 shrink-0">
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
                    </div>
                  </div>
                  {ticket.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{ticket.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor(ticket.priority)}`}>
                      {ticket.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.submitted_by_name}</span>
                    {ticket.assigned_to_name && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">→ {ticket.assigned_to_name}</span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Type</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Ticket #</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Summary</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Opened By</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Assigned To</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Created</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {paginated.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
                    >
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                          {ticket.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">#{ticket.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-xs">{ticket.title}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{ticket.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{ticket.submitted_by_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {ticket.assigned_to_name
                          ? <span className="text-sm text-gray-700 dark:text-gray-200">{ticket.assigned_to_name}</span>
                          : <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(ticket.created_at).toLocaleDateString()}</span>
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
              {paginationBar}
            </div>

            {/* Mobile pagination */}
            {totalPages > 1 && (
              <div className="md:hidden bg-white dark:bg-gray-800 rounded-2xl shadow-sm mt-3">
                {paginationBar}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dispatcher;
