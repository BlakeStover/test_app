import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

function Dispatcher() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
    }
  }, [token]);

  useEffect(() => {
    if (!user || (user.role !== 'dispatcher' && user.role !== 'admin')) {
      window.location.href = '/dashboard';
    }
  }, [user]);

  useEffect(() => {
    const getTickets = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data);
      } catch {
        setError('Failed to load tickets');
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
        {
          status: newStatus,
          assigned_to: ticket.assigned_to,
          priority: ticket.priority,
        },
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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Dispatcher Dashboard</h2>
          <span className="text-sm text-gray-500">{tickets.length} total tickets</span>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 text-lg">No tickets yet</p>
            <p className="text-gray-400 text-sm mt-1">New requests will appear here in real time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-2xl shadow-sm p-6">
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
                    <div className="flex gap-2">
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
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

export default Dispatcher;