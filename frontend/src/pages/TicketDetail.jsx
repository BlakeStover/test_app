import { useState, useEffect } from 'react';
import axios from 'axios';

function TicketDetail() {
  const [ticket, setTicket] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const ticketId = new URLSearchParams(window.location.search).get('id');

  useEffect(() => {
    if (!token) window.location.href = '/';
  }, [token]);

  useEffect(() => {
    const getTicket = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTicket(res.data);
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

    if (ticketId) {
      getTicket();
      getNotes();
    }
  }, [ticketId, token]);

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

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/api/tickets/${ticketId}`,
        {
          status: newStatus,
          assigned_to: ticket.assigned_to,
          priority: ticket.priority,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTicket(res.data);
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

  const roleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'dispatcher': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const backUrl = user?.role === 'dispatcher' || user?.role === 'admin'
    ? '/dispatcher'
    : '/dashboard';

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400">Loading ticket...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Campus Ticket System</h1>
        <button
          onClick={() => window.location.href = backUrl}
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
        >
          Back
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400">#{ticket.id}</span>
                <h2 className="text-xl font-bold text-gray-800">{ticket.title}</h2>
              </div>
              <p className="text-gray-500 text-sm">
                Submitted on {new Date(ticket.created_at).toLocaleDateString()} at {new Date(ticket.created_at).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${statusColor(ticket.status)}`}>
                {ticket.status}
              </span>
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${priorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 text-sm">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Category</p>
              <p className="text-sm text-gray-700 font-medium">{ticket.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Last updated</p>
              <p className="text-sm text-gray-700 font-medium">{new Date(ticket.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {(user?.role === 'dispatcher' || user?.role === 'admin') && (
            <div className="border-t border-gray-100 pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Update Status</h3>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Notes {notes.length > 0 && (
              <span className="text-gray-400 font-normal text-sm ml-1">({notes.length})</span>
            )}
          </h3>

          {notes.length === 0 ? (
            <p className="text-gray-400 text-sm mb-6">No notes yet — be the first to add one.</p>
          ) : (
            <div className="space-y-4 mb-6">
              {notes.map((note) => (
                <div key={note.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-800">{note.author_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor(note.author_role)}`}>
                      {note.author_role}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                        {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                        {note.edited_at && (
                            <span className="ml-2 italic text-gray-400">
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
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none mb-2"
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
                          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-600 text-sm mb-2">{note.content}</p>
                      {(note.user_id === user?.id || user?.role === 'admin') && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditStart(note)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-xs text-red-600 hover:underline"
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

          <form onSubmit={handleAddNote} className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add a note</h4>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none mb-3"
              placeholder="Add a note, update, or comment..."
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Add Note
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TicketDetail;