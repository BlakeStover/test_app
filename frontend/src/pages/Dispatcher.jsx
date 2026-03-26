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

    return () => {
      socket.disconnect();
    };
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
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      setError('Failed to update ticket');
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'open': return '#fef3c7';
      case 'in_progress': return '#dbeafe';
      case 'resolved': return '#d1fae5';
      case 'closed': return '#f3f4f6';
      default: return '#fef3c7';
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dispatcher Dashboard</h2>
        <div>
          <span style={{ marginRight: '1rem' }}>Welcome, {user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h3>All Tickets ({tickets.length})</h3>

      {tickets.length === 0 ? (
        <p>No tickets yet.</p>
      ) : (
        tickets.map((ticket) => (
          <div key={ticket.id} style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>#{ticket.id} — {ticket.title}</h4>
                <p style={{ color: '#666', margin: '0.25rem 0' }}>{ticket.description}</p>
                <small style={{ color: '#999' }}>
                  Category: {ticket.category} · Priority: {ticket.priority} · Submitted: {new Date(ticket.created_at).toLocaleDateString()}
                </small>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <span style={{
                  background: statusColor(ticket.status),
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap'
                }}>
                  {ticket.status}
                </span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                  style={{ padding: '0.25rem', fontSize: '0.85rem' }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Dispatcher;