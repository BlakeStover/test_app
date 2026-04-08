import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

function TicketDetail() {
  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignees, setAssignees] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { user, token } = useAuth();
  const ticketId = new URLSearchParams(window.location.search).get('id');

  const isStudent = user?.role === 'student';
  const isDispatcherOrAdmin = user?.role === 'dispatcher' || user?.role === 'admin';

  useEffect(() => {
    const getTicket = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTicket(res.data);
        setSelectedAssignee(res.data.assigned_to != null ? String(res.data.assigned_to) : '');
      } catch {
        setError('Failed to load ticket');
      }
    };

    const getNotes = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/notes/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotes(res.data);
      } catch {
        setError('Failed to load notes');
      }
    };

    const getHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/tickets/${ticketId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHistory(res.data);
      } catch {
        // history is non-critical — silently ignore
      }
    };

    if (ticketId) {
      Promise.all([getTicket(), getNotes(), getHistory()]).finally(() => setLoading(false));
    }
  }, [ticketId, token]);

  useEffect(() => {
    if (!isDispatcherOrAdmin) return;
    axios
      .get('http://localhost:5000/api/tickets/assignees', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setAssignees(res.data))
      .catch(() => {});
  }, [token, isDispatcherOrAdmin]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      const res = await axios.post(
        `http://localhost:5000/api/notes/${ticketId}`,
        { content: newNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes((prev) => [...prev, res.data]);
      setNewNote('');
    } catch {
      setError('Failed to add note');
    }
  };

  const handleEditStart = (note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleEditSave = async (noteId) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/notes/${noteId}`,
        { content: editingContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotes((prev) => prev.map((n) => (n.id === noteId ? res.data : n)));
      setEditingNoteId(null);
      setEditingContent('');
    } catch {
      setError('Failed to update note');
    }
  };

  const handleEditCancel = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      setError('Failed to delete note');
    }
  };

  const handleCancelTicket = async () => {
    setCancelling(true);
    try {
      const res = await axios.post(
        `http://localhost:5000/api/tickets/${ticketId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data);
      // Refresh notes so the cancellation note appears
      const notesRes = await axios.get(`http://localhost:5000/api/notes/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(notesRes.data);
      setCancelConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel ticket');
      setCancelConfirm(false);
    } finally {
      setCancelling(false);
    }
  };

  const refreshHistory = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/tickets/${ticketId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHistory(res.data);
    } catch {
      // non-critical
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/tickets/${ticketId}`,
        { status: newStatus, assigned_to: ticket.assigned_to, priority: ticket.priority },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data);
      refreshHistory();
    } catch {
      setError('Failed to update ticket');
    }
  };

  const handleAssignmentChange = async () => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/tickets/${ticketId}`,
        {
          status: ticket.status,
          priority: ticket.priority,
          assigned_to: selectedAssignee ? Number(selectedAssignee) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data);
      refreshHistory();
    } catch {
      setError('Failed to update assignment');
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
      case 'in_progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      case 'closed': return 'Closed';
      default: return status;
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

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'dispatcher': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fieldLabel = (field) => {
    if (field === 'assigned_to') return 'assignment';
    return field;
  };

  const formatHistoryValue = (field, value, assigneeName) => {
    if (field === 'assigned_to') {
      return value == null ? 'Unassigned' : (assigneeName || `User #${value}`);
    }
    return value ?? '—';
  };

  const backUrl = isDispatcherOrAdmin ? '/dispatcher' : '/dashboard';

  const inputClass = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white';
  const selectClass = 'text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Cancel this request?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you would like to cancel this request? This cannot be undone.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCancelTicket}
                disabled={cancelling}
                className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
              </button>
              <button
                onClick={() => setCancelConfirm(false)}
                disabled={cancelling}
                className="w-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium py-3 rounded-xl transition-colors hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-40"
              >
                Keep request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen photo lightbox */}
      {photoOpen && ticket?.photo_filename && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPhotoOpen(false)}
        >
          <img
            src={`http://localhost:5000/uploads/${ticket.photo_filename}`}
            alt="Ticket photo"
            className="max-w-full max-h-full object-contain rounded-xl"
          />
          <button
            onClick={() => setPhotoOpen(false)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-lg leading-none transition-colors"
            aria-label="Close photo"
          >
            ✕
          </button>
        </div>
      )}

      <Navbar>
        <button
          onClick={() => window.location.href = backUrl}
          className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors"
        >
          Back
        </button>
      </Navbar>

      <div className={`mx-auto px-4 py-8 ${isStudent ? 'max-w-lg' : 'max-w-4xl'}`}>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">#{ticket.id}</span>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{ticket.title}</h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Submitted on {new Date(ticket.created_at).toLocaleDateString()} at {new Date(ticket.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor(ticket.status)}`}>
                {statusLabel(ticket.status)}
              </span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {/* Photo */}
          {ticket.photo_filename && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo</h3>
              <button
                onClick={() => setPhotoOpen(true)}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl"
                aria-label="View full-size photo"
              >
                <img
                  src={`http://localhost:5000/uploads/${ticket.photo_filename}`}
                  alt="Ticket photo"
                  className="w-28 h-28 object-cover rounded-xl border border-gray-200 dark:border-gray-700 hover:opacity-90 active:opacity-75 transition-opacity cursor-pointer"
                />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Category</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 font-medium capitalize">{ticket.category.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Last updated</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{new Date(ticket.updated_at).toLocaleDateString()}</p>
            </div>
            {isDispatcherOrAdmin && (
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Assigned to</p>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                  {ticket.assigned_to_name ?? <span className="text-gray-400 dark:text-gray-500 font-normal">Unassigned</span>}
                </p>
              </div>
            )}
          </div>

          {isDispatcherOrAdmin && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4 flex flex-wrap gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h3>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Unassigned</option>
                    {assignees.map((a) => (
                      <option key={a.id} value={String(a.id)}>{a.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignmentChange}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            Notes {notes.length > 0 && (
              <span className="text-gray-400 dark:text-gray-500 font-normal text-sm ml-1">({notes.length})</span>
            )}
          </h3>

          {notes.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">No notes yet.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {notes.map((note) => (
                <div key={note.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{note.author_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor(note.author_role)}`}>
                      {note.author_role}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 sm:ml-auto">
                      {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                      {note.edited_at && (
                        <span className="ml-2 italic">
                          (edited {new Date(note.edited_at).toLocaleDateString()} at {new Date(note.edited_at).toLocaleTimeString()})
                        </span>
                      )}
                    </span>
                  </div>

                  {editingNoteId === note.id ? (
                    <div>
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className={`${inputClass} h-24 resize-none mb-2`}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditSave(note.id)}
                          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{note.content}</p>
                      {/* Students cannot edit or delete notes */}
                      {!isStudent && (note.user_id === user?.id || user?.role === 'admin') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStart(note)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isStudent && (
            <form onSubmit={handleAddNote} className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add a note</h4>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className={`${inputClass} h-24 resize-none mb-3`}
                placeholder="Add a note, update, or comment..."
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Add Note
              </button>
            </form>
          )}
        </div>

        {/* Cancel button — students only, only when ticket is still open/in_progress */}
        {isStudent && ['open', 'in_progress'].includes(ticket.status) && (
          <div className="mt-4">
            <button
              onClick={() => setCancelConfirm(true)}
              className="w-full border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 font-medium py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Cancel this request
            </button>
          </div>
        )}

        <div className="mt-8 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500">
              Change history
              {history.length > 0 && (
                <span className="ml-1.5 text-gray-300 dark:text-gray-600">({history.length})</span>
              )}
            </span>
            <span className={`text-gray-300 dark:text-gray-600 text-xs transition-transform duration-200 inline-block ${historyOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>

          {historyOpen && (
            <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
              {history.length === 0 ? (
                <p className="text-xs text-gray-300 dark:text-gray-600 pt-4">No changes recorded yet.</p>
              ) : (
                <div className="space-y-3 pt-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-4 text-xs border-l border-gray-100 dark:border-gray-700 pl-3">
                      <div className="flex-1 min-w-0 text-gray-400 dark:text-gray-500">
                        <span className="text-gray-500 dark:text-gray-400">{entry.changed_by_name}</span>
                        {' changed '}
                        <span className="text-gray-500 dark:text-gray-400">{fieldLabel(entry.field)}</span>
                        {' from '}
                        <span className="italic">
                          {formatHistoryValue(entry.field, entry.old_value, entry.old_assignee_name)}
                        </span>
                        {' → '}
                        <span className="text-gray-500 dark:text-gray-400">
                          {formatHistoryValue(entry.field, entry.new_value, entry.new_assignee_name)}
                        </span>
                      </div>
                      <span className="text-gray-300 dark:text-gray-600 whitespace-nowrap shrink-0 pt-0.5">
                        {new Date(entry.changed_at).toLocaleDateString()} at {new Date(entry.changed_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;
