import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const { user, token, logout } = useAuth();

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paginated = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const getUsers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data);
      } catch {
        setError('Failed to load users');
      } finally {
        setLoading(false);
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
      setUsers(users.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setTimeout(() => setSuccess(''), 3000);
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
      const newUsers = users.filter((u) => u.id !== userId);
      setUsers(newUsers);
      const newTotalPages = Math.max(1, Math.ceil(newUsers.length / PAGE_SIZE));
      if (page > newTotalPages) setPage(newTotalPages);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Failed to delete user');
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'dispatcher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}</span>
        <button
          onClick={() => window.location.href = '/dispatcher'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Dispatcher
        </button>
        <button
          onClick={() => window.location.href = '/admin/reports'}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Reports
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Panel</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {users.length} total users
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-gray-400 dark:text-gray-500 text-lg">No users yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginated.map((u) => (
              <div key={u.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{u.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Joined: {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${roleColor(u.role)}`}>
                      {u.role}
                    </span>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    >
                      <option value="student">Student</option>
                      <option value="dispatcher">Dispatcher</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 px-4 py-1 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-4">
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
