import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const statusPill = (status) => {
  switch (status) {
    case 'open':        return { label: 'Open',        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    case 'in_progress': return { label: 'In Progress',  cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'resolved':    return { label: 'Resolved',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    case 'closed':      return { label: 'Closed',       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
    default:            return { label: status,         cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
  }
};

function TicketList({ tickets }) {
  if (tickets.length === 0) {
    return (
      <p className="text-gray-400 dark:text-gray-500 text-sm px-1 py-4">No tickets in this section.</p>
    );
  }
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {tickets.map((ticket, i) => {
        const pill = statusPill(ticket.status);
        return (
          <button
            key={ticket.id}
            onClick={() => window.location.href = `/ticket?id=${ticket.id}`}
            className={`w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{ticket.title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{timeAgo(ticket.created_at)}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${pill.cls}`}>
              {pill.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, tickets, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3 px-1 group"
      >
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {title}
          <span className="ml-2 font-normal normal-case tracking-normal text-gray-300 dark:text-gray-600">
            ({tickets.length})
          </span>
        </h2>
        <span className={`text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200 inline-block ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && <TicketList tickets={tickets} />}
    </div>
  );
}

function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

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

  const activeTickets = tickets.filter((t) => ['open', 'in_progress'].includes(t.status));
  const closedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          Back
        </button>
      </Navbar>

      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">My Tickets</h1>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-10 text-center">
            <p className="text-gray-400 dark:text-gray-500">No requests yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Tap <span className="font-medium">Submit a request</span> on the home screen to get started.
            </p>
          </div>
        ) : (
          <>
            <Section title="Active" tickets={activeTickets} defaultOpen={true} />
            <Section title="Closed" tickets={closedTickets} defaultOpen={false} />
          </>
        )}
      </div>
    </div>
  );
}

export default MyTickets;
