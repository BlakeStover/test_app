import { useState, useEffect, useRef } from 'react';
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

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, token, logout } = useAuth();
  const recentRef = useRef(null);

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

  const recent = tickets.slice(0, 5);
  const displayName = user?.preferred_name || user?.name?.split(' ')[0] || 'there';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const scrollToRecent = () => {
    recentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}</span>
        <button
          onClick={() => window.location.href = '/settings'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Settings
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

      <div className="max-w-lg mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Hero section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm px-6 py-8 mb-6 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">Hi, {displayName} 👋</p>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">How can we help you today?</h1>

          <button
            onClick={() => window.location.href = '/new-ticket'}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base px-6 py-4 rounded-2xl transition-colors shadow-sm mb-3"
          >
            Submit a request
          </button>

          <button
            onClick={scrollToRecent}
            className="w-full border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-gray-300 font-medium text-base px-6 py-4 rounded-2xl transition-colors"
          >
            Track my tickets
          </button>
        </div>

        {/* Recent tickets */}
        <div ref={recentRef}>
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">
            Recent
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-10 text-center">
              <p className="text-gray-400 dark:text-gray-500">No requests yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Tap <span className="font-medium">Submit a request</span> to get started
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {recent.map((ticket, i) => {
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
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
