import { useState, useEffect } from 'react';
import axios from 'axios';

function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (!token) {
      window.location.href = '/';
    }
  }, [token]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch {
        setError('Failed to load users');
      }
    };
    getUsers();
  }, [token]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/users/${userId}`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Role updated successfully');
      setUsers(users.map((u) =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch {
      setError('Failed to update role');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('User deleted successfully');
      setUsers(users.filter((u) => u.id !== userId));
    } catch {
      setError('Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return '#fde8e8';
      case 'dispatcher': return '#dbeafe';
      case 'student': return '#d1fae5';
      default: return '#f3f4f6';
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Admin Panel</h2>
        <div>
          <span style={{ marginRight: '1rem' }}>Welcome, {user?.name}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}

      <h3>All Users ({users.length})</h3>

      {users.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        users.map((u) => (
          <div key={u.id} style={{
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0' }}>{u.name}</h4>
              <small style={{ color: '#999' }}>{u.email} · Joined: {new Date(u.created_at).toLocaleDateString()}</small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                background: roleColor(u.role),
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.85rem'
              }}>
                {u.role}
              </span>
              <select
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                style={{ padding: '0.25rem', fontSize: '0.85rem' }}
              >
                <option value="student">Student</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={() => handleDelete(u.id)}
                style={{
                  background: '#fee2e2',
                  border: 'none',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#991b1b'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Admin;