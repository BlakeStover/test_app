import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const CATEGORY_ICON = {
  campus_safety: '🚨',
  maintenance: '🔧',
  it: '💻',
  cleaning: '🧹',
  other: '📋',
};

// Build triage cards from the full ticket list.
// Each ticket appears at most once; priority: Emergency > Overdue > Unassigned.
// is_overdue is computed by the backend using DB-configured SLA thresholds.
function buildTriageCards(tickets) {
  const cards = [];
  for (const t of tickets) {
    const isActive = t.status === 'open' || t.status === 'in_progress';
    if (!isActive) continue;

    const isEmergency = t.category === 'campus_safety';
    const isOverdue = !!t.is_overdue;
    const isUnassigned = t.status === 'open' && !t.assigned_to;

    if (!isEmergency && !isOverdue && !isUnassigned) continue;

    const ageHours = (Date.now() - new Date(t.created_at).getTime()) / 3600000;
    let label;
    if (isEmergency) label = 'Emergency';
    else if (isOverdue) label = `Overdue — ${Math.round(ageHours)}h`;
    else label = 'Unassigned';

    cards.push({ ticket: t, label, priority: isEmergency ? 3 : isOverdue ? 2 : 1 });
  }
  cards.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.ticket.created_at) - new Date(b.ticket.created_at);
  });
  return cards;
}

function Dispatcher() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all'); // 'all' | 'unassigned' | userId string
  const [assignees, setAssignees] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkStatusVal, setBulkStatusVal] = useState('');
  const [bulkAssigneeVal, setBulkAssigneeVal] = useState('');

  // Step 30: quick-action success flash state { [ticketId]: 'assign'|'progress'|'resolved' }
  const [rowSuccesses, setRowSuccesses] = useState({});

  // Step 31: my-queue toggle (persisted per user)
  const { user, token, logout } = useAuth();
  const [myQueueOnly, setMyQueueOnly] = useState(() =>
    localStorage.getItem(`myQueue_${user?.id}`) === 'true'
  );

  // Step 33: dispatcher availability
  const [available, setAvailable] = useState(null); // null = loading

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
    .filter((t) => {
      if (filterAssignee === 'all') return true;
      if (filterAssignee === 'unassigned') return !t.assigned_to;
      return String(t.assigned_to) === filterAssignee;
    })
    .filter((t) => !myQueueOnly || String(t.assigned_to) === String(user?.id))
    .sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'date_asc') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'priority_desc') return priorityOrder[b.priority] - priorityOrder[a.priority];
      if (sortBy === 'priority_asc') return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (sortBy === 'id_desc') return b.id - a.id;
      if (sortBy === 'id_asc') return a.id - b.id;
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [filterStatus, filterPriority, filterCategory, filterAssignee, sortBy, search]);

  useEffect(() => {
    const load = async () => {
      try {
        const [ticketsRes, assigneesRes, availRes] = await Promise.all([
          axios.get('http://localhost:5000/api/tickets', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/tickets/assignees', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/api/users/availability', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setTickets(ticketsRes.data);
        setAssignees(assigneesRes.data);
        setAvailable(availRes.data.available);
      } catch {
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    load();

    const socket = io('http://localhost:5000');
    socket.on('ticket_created', (newTicket) => setTickets((prev) => [newTicket, ...prev]));
    socket.on('ticket_updated', (updatedTicket) =>
      setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)))
    );
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

  // Step 30: quick-action row buttons
  const flashSuccess = (ticketId, action) => {
    setRowSuccesses((prev) => ({ ...prev, [ticketId]: action }));
    setTimeout(() => setRowSuccesses((prev) => { const n = { ...prev }; delete n[ticketId]; return n; }), 1500);
  };

  const handleQuickAction = async (ticketId, action) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    let body;
    if (action === 'assign')   body = { status: ticket.status,      priority: ticket.priority, assigned_to: user.id };
    if (action === 'progress') body = { status: 'in_progress',       priority: ticket.priority, assigned_to: ticket.assigned_to };
    if (action === 'resolved') body = { status: 'resolved',          priority: ticket.priority, assigned_to: ticket.assigned_to };
    try {
      await axios.put(`http://localhost:5000/api/tickets/${ticketId}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      flashSuccess(ticketId, action);
    } catch {
      setError('Quick action failed');
    }
  };

  // Step 33: availability toggle
  const handleToggleAvailability = async () => {
    const next = !available;
    setAvailable(next);
    try {
      await axios.patch('http://localhost:5000/api/users/availability', { available: next }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setAvailable(!next); // revert on error
    }
  };

  // Column sort
  const handleColumnSort = (field) =>
    setSortBy((prev) => (prev === `${field}_desc` ? `${field}_asc` : `${field}_desc`));

  const sortIndicator = (field) => {
    if (sortBy === `${field}_desc`) return <span className="ml-1 text-blue-500 text-xs">▼</span>;
    if (sortBy === `${field}_asc`) return <span className="ml-1 text-blue-500 text-xs">▲</span>;
    return <span className="ml-1 text-gray-300 dark:text-gray-600 text-xs">⇅</span>;
  };

  const thSort = 'text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4 cursor-pointer select-none hover:text-gray-600 dark:hover:text-gray-300 transition-colors';
  const thPlain = 'text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-6 py-4';

  // Bulk selection helpers
  const allPageSelected = paginated.length > 0 && paginated.every((t) => selectedIds.has(t.id));
  const somePageSelected = paginated.some((t) => selectedIds.has(t.id)) && !allPageSelected;

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paginated.forEach((t) => next.delete(t.id));
      else paginated.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const handleSelectOne = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkModal = (type, value, label) => {
    setPendingBulkAction({ type, value, label });
    setShowBulkModal(true);
  };

  const handleBulkSubmit = async () => {
    setBulkSubmitting(true);
    try {
      const body = { ids: [...selectedIds] };
      if (pendingBulkAction.type === 'status') body.status = pendingBulkAction.value;
      if (pendingBulkAction.type === 'assign') body.assigned_to = pendingBulkAction.value;
      await axios.put('http://localhost:5000/api/tickets/bulk', body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedIds(new Set());
      setShowBulkModal(false);
      setPendingBulkAction(null);
      setBulkStatusVal('');
      setBulkAssigneeVal('');
    } catch {
      setError('Failed to apply bulk update');
      setShowBulkModal(false);
    } finally {
      setBulkSubmitting(false);
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
    setFilterAssignee('all');
    setMyQueueOnly(false);
    localStorage.setItem(`myQueue_${user?.id}`, 'false');
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
        {/* Step 33: on-duty / off-duty pill */}
        {available !== null && (
          <button
            onClick={handleToggleAvailability}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium transition-colors ${
              available
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${available ? 'bg-green-500' : 'bg-gray-400'}`} />
            {available ? 'On duty' : 'Off duty'}
          </button>
        )}
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

      {/* Bulk confirmation modal */}
      {showBulkModal && pendingBulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Confirm bulk update</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
              Apply <span className="font-medium">{pendingBulkAction.label}</span> to{' '}
              <span className="font-medium">{selectedIds.size} ticket{selectedIds.size !== 1 ? 's' : ''}</span>?
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">This action will be logged in each ticket's history.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBulkModal(false); setPendingBulkAction(null); }}
                disabled={bulkSubmitting}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSubmit}
                disabled={bulkSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
              >
                {bulkSubmitting ? 'Applying…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              const isActive =
                key === 'unassigned'
                  ? filterAssignee === 'unassigned'
                  : filterStatus === key && key !== 'total';
              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'total') {
                      setFilterStatus('all');
                      setFilterAssignee('all');
                    } else if (key === 'unassigned') {
                      setFilterAssignee(filterAssignee === 'unassigned' ? 'all' : 'unassigned');
                      setFilterStatus('all');
                    } else {
                      setFilterStatus(filterStatus === key ? 'all' : key);
                      setFilterAssignee('all');
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

        {/* Triage strip */}
        {!loading && (() => {
          const triageCards = buildTriageCards(tickets);
          if (triageCards.length === 0) return null;
          return (
            <div className="mb-4">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                Needs attention ({triageCards.length})
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {triageCards.map(({ ticket: t, label }) => (
                  <button
                    key={t.id}
                    onClick={() => (window.location.href = `/ticket?id=${t.id}`)}
                    className={`flex-shrink-0 flex flex-col gap-1 px-4 py-3 rounded-xl shadow-sm border text-left transition-all hover:shadow-md min-w-[160px] max-w-[200px] ${
                      label === 'Emergency'
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
                        : label.startsWith('Overdue')
                        ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'
                        : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{CATEGORY_ICON[t.category] ?? '📋'}</span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{t.id}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{t.submitted_by_name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full self-start ${
                      label === 'Emergency'
                        ? 'bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200'
                        : label.startsWith('Overdue')
                        ? 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200'
                        : 'bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-200'
                    }`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Filter bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by #, title, description, category, submitter…"
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white w-full sm:w-72"
          />

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setFilterAssignee('all'); }} className={selectClass}>
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

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned</label>
            <select
              value={filterAssignee}
              onChange={(e) => { setFilterAssignee(e.target.value); setFilterStatus('all'); }}
              className={selectClass}
            >
              <option value="all">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Step 31: My queue toggle */}
          <button
            onClick={() => {
              const next = !myQueueOnly;
              setMyQueueOnly(next);
              localStorage.setItem(`myQueue_${user?.id}`, String(next));
            }}
            className={`text-sm px-3 py-2 rounded-lg font-medium transition-colors shrink-0 ${
              myQueueOnly
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            My queue ({tickets.filter((t) => String(t.assigned_to) === String(user?.id)).length})
          </button>

          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline ml-auto"
          >
            Clear filters
          </button>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {selectedIds.size} selected
            </span>

            <div className="flex items-center gap-2">
              <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">Set status:</label>
              <select
                value={bulkStatusVal}
                onChange={(e) => setBulkStatusVal(e.target.value)}
                className="text-sm border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="">Choose…</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={() => bulkStatusVal && openBulkModal('status', bulkStatusVal, `status → ${bulkStatusVal.replace('_', ' ')}`)}
                disabled={!bulkStatusVal}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-blue-600 dark:text-blue-400 font-medium">Assign to:</label>
              <select
                value={bulkAssigneeVal}
                onChange={(e) => setBulkAssigneeVal(e.target.value)}
                className="text-sm border border-blue-300 dark:border-blue-600 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value="">Choose…</option>
                <option value="null">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!bulkAssigneeVal) return;
                  const val = bulkAssigneeVal === 'null' ? null : Number(bulkAssigneeVal);
                  const label = bulkAssigneeVal === 'null'
                    ? 'assign → Unassigned'
                    : `assign → ${assignees.find((a) => String(a.id) === bulkAssigneeVal)?.name}`;
                  openBulkModal('assign', val, label);
                }}
                disabled={!bulkAssigneeVal}
                className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>

            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 underline ml-auto"
            >
              Clear selection
            </button>
          </div>
        )}

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
                  onClick={(e) => {
                    if (selectedIds.size > 0) handleSelectOne(ticket.id, e);
                    else window.location.href = `/ticket?id=${ticket.id}`;
                  }}
                  className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${selectedIds.has(ticket.id) ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(ticket.id)}
                      onChange={(e) => handleSelectOne(ticket.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">#{ticket.id}</span>
                        {ticket.is_overdue && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-white text-sm mt-0.5 truncate">{ticket.title}</h3>
                    </div>
                    <div onClick={(e) => e.stopPropagation()} className="ml-1 shrink-0">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 ml-7">{ticket.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 ml-7">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {ticket.category}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor(ticket.priority)}`}>
                      {ticket.priority}
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
                    <th className="px-4 py-4 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={(el) => { if (el) el.indeterminate = somePageSelected; }}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className={thSort} onClick={() => handleColumnSort('id')}>
                      Ticket #{sortIndicator('id')}
                    </th>
                    <th className={thPlain}>Summary</th>
                    <th className={thPlain}>Opened By</th>
                    <th className={thPlain}>Assigned To</th>
                    <th className={thSort} onClick={() => handleColumnSort('date')}>
                      Created{sortIndicator('date')}
                    </th>
                    <th className={thSort} onClick={() => handleColumnSort('priority')}>
                      Priority{sortIndicator('priority')}
                    </th>
                    <th className={thPlain}>Status</th>
                    <th className="w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {paginated.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedIds.has(ticket.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                      onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ticket.id)}
                          onChange={(e) => handleSelectOne(ticket.id, e)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">#{ticket.id}</span>
                          {ticket.is_overdue && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate max-w-xs">{ticket.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{ticket.category.replace('_', ' ')}</span>
                          {ticket.description && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{ticket.description}</p>
                          )}
                        </div>
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
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
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
                      {/* Step 30: quick-action buttons (reveal on row hover) */}
                      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Assign to self */}
                          <button
                            onClick={() => handleQuickAction(ticket.id, 'assign')}
                            title={ticket.assigned_to && String(ticket.assigned_to) !== String(user?.id) ? 'Reassign to me' : 'Assign to me'}
                            className={`p-1.5 rounded-lg transition-colors ${rowSuccesses[ticket.id] === 'assign' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {/* Mark in progress */}
                          <button
                            onClick={() => handleQuickAction(ticket.id, 'progress')}
                            title="Mark in progress"
                            disabled={ticket.status === 'in_progress'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${rowSuccesses[ticket.id] === 'progress' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </button>
                          {/* Mark resolved */}
                          <button
                            onClick={() => handleQuickAction(ticket.id, 'resolved')}
                            title="Mark resolved"
                            disabled={ticket.status === 'resolved' || ticket.status === 'closed'}
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${rowSuccesses[ticket.id] === 'resolved' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
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
