import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function Dashboard() {
  const { user, logout } = useAuth();
  const displayName = user?.preferred_name || user?.name?.split(' ')[0] || 'there';

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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

      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-8">
        {/* Hero section */}
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl shadow-sm px-8 py-12 text-center">
          <p className="text-base text-gray-400 dark:text-gray-500 mb-2">Hi, {displayName} 👋</p>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-10">How can we help you today?</h1>

          <button
            onClick={() => window.location.href = '/submit'}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-lg px-6 py-5 rounded-2xl transition-colors shadow-sm mb-4"
          >
            Submit a request
          </button>

          <button
            onClick={() => window.location.href = '/my-tickets'}
            className="w-full border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-gray-600 dark:text-gray-300 font-medium text-lg px-6 py-5 rounded-2xl transition-colors"
          >
            Track my tickets
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
