import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './context/DarkModeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewTicket from './pages/NewTicket';
import Dispatcher from './pages/Dispatcher';
import Admin from './pages/Admin';
import AdminReports from './pages/AdminReports';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import TicketDetail from './pages/TicketDetail';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import TicketWizard from './pages/TicketWizard';
import MyTickets from './pages/MyTickets';

// Requests browser notification permission once per student and shows a
// notification when a dispatcher posts a non-internal reply on their ticket.
function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    if (!('Notification' in window)) return;

    if (!localStorage.getItem('notificationPermissionAsked')) {
      Notification.requestPermission().then((permission) => {
        localStorage.setItem('notificationPermissionAsked', permission);
      });
    }

    const socket = io('http://localhost:5000');

    socket.on('note_added', (note) => {
      if (note.internal) return;
      if (note.author_role === 'student') return;
      if (note.ticket_created_by !== user.id) return;
      if (Notification.permission !== 'granted') return;

      const notif = new Notification('A dispatcher replied to your request', {
        body: note.content.length > 100 ? note.content.slice(0, 97) + '…' : note.content,
        tag: `ticket-reply-${note.ticket_id}`,
      });
      notif.onclick = () => {
        window.focus();
        window.location.href = `/ticket?id=${note.ticket_id}`;
      };
    });

    return () => socket.disconnect();
  }, [user]);

  return null;
}

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <AuthProvider>
          <PushNotificationSetup />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/new-ticket" element={
              <ProtectedRoute allowedRoles={['student']}>
                <NewTicket />
              </ProtectedRoute>
            } />
            <Route path="/dispatcher" element={
              <ProtectedRoute allowedRoles={['dispatcher', 'admin']}>
                <Dispatcher />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Admin />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminReports />
              </ProtectedRoute>
            } />
            <Route path="/ticket" element={
              <ProtectedRoute>
                <TicketDetail />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/onboarding" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Onboarding />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/submit" element={
              <ProtectedRoute allowedRoles={['student']}>
                <TicketWizard />
              </ProtectedRoute>
            } />
            <Route path="/my-tickets" element={
              <ProtectedRoute allowedRoles={['student']}>
                <MyTickets />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
