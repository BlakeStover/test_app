import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { STUDENT_STATUS_LABELS } from '../constants/wizardTemplates';

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
  const label = STUDENT_STATUS_LABELS[status] || status;
  switch (status) {
    case 'open':        return { label, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    case 'in_progress': return { label, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' };
    case 'resolved':    return { label, cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    case 'closed':      return { label, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
    default:            return { label, cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
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
  const [ratingTarget, setRatingTarget] = useState(null);
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

  // Find the first resolved, unrated, un-dismissed ticket to prompt for rating
  useEffect(() => {
    if (loading || tickets.length === 0) return;
    const dismissed = JSON.parse(localStorage.getItem('ratingDismissed') || '[]');
    const target = tickets.find(
      (t) => t.status === 'resolved' && t.rating == null && !dismissed.includes(t.id)
    );
    setRatingTarget(target || null);
  }, [tickets, loading]);

  const handleRate = async (rating) => {
    if (!ratingTarget) return;
    try {
      await axios.patch(
        `http://localhost:5000/api/tickets/${ratingTarget.id}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTickets((prev) =>
        prev.map((t) => (t.id === ratingTarget.id ? { ...t, rating } : t))
      );
    } catch { /* non-critical */ }
    setRatingTarget(null);
  };

  const handleSkipRating = () => {
    if (!ratingTarget) return;
    const dismissed = JSON.parse(localStorage.getItem('ratingDismissed') || '[]');
    localStorage.setItem('ratingDismissed', JSON.stringify([...dismissed, ratingTarget.id]));
    setRatingTarget(null);
  };

  const activeTickets = tickets.filter((t) => ['open', 'in_progress'].includes(t.status));
  const closedTickets = tickets.filter((t) => ['resolved', 'closed'].includes(t.status));

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Rating bottom sheet */}
      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleSkipRating} />
          <div className="relative bg-white dark:bg-gray-800 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-xl px-6 pt-8 pb-10">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-1 truncate px-4">
              {ratingTarget.title}
            </p>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-6">
              How did we do?
            </h2>
            <div className="flex justify-center gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  className="text-4xl leading-none text-amber-400 hover:scale-110 active:scale-90 transition-transform"
                >
                  ★
                </button>
              ))}
            </div>
            <button
              onClick={handleSkipRating}
              className="w-full text-sm text-gray-400 dark:text-gray-500 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

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
