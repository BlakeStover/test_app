import { useState } from 'react';
import axios from 'axios';

function NewTicket() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [priority, setPriority] = useState('normal');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        'http://localhost:5000/api/tickets',
        {
          title,
          description,
          category,
          priority,
          created_by: user.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess('Ticket submitted successfully!');
      setTitle('');
      setDescription('');
      setCategory('maintenance');
      setPriority('normal');
    } catch {
      setError('Failed to submit ticket. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Submit a Request</h2>
        <button onClick={() => window.location.href = '/dashboard'}>
          Back to Dashboard
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label>Title</label>
          <br />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            placeholder="Brief description of the issue"
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Description</label>
          <br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', height: '120px' }}
            placeholder="Provide more details about the issue and location"
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Category</label>
          <br />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="maintenance">Maintenance</option>
            <option value="campus_safety">Campus Safety</option>
            <option value="it">IT Support</option>
            <option value="cleaning">Cleaning</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label>Priority</label>
          <br />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <button
          type="submit"
          style={{ width: '100%', padding: '0.75rem' }}
        >
          Submit Request
        </button>
      </form>
    </div>
  );
}

export default NewTicket;