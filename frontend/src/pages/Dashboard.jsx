import { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/tickets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data);
      } catch {
        setError('Failed to load tickets');
      }
    };
    fetchTickets();
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Dashboard</h2>
        <div>
          <span style={{ marginRight: '1rem' }}>Welcome, {user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Tickets</h3>
        <button onClick={() => window.location.href = '/new-ticket'}>
          + New Request
        </button>
      </div>

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
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h4 style={{ margin: 0 }}>{ticket.title}</h4>
              <span style={{
                background: ticket.status === 'open' ? '#fef3c7' : '#d1fae5',
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.85rem'
              }}>
                {ticket.status}
              </span>
            </div>
            <p style={{ color: '#666', margin: '0.5rem 0' }}>{ticket.description}</p>
            <small style={{ color: '#999' }}>Category: {ticket.category} · Priority: {ticket.priority}</small>
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;