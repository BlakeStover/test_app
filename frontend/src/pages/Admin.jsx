import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const API = 'http://localhost:5000';

// ── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paginated = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const h = { Authorization: `Bearer ${token}` };

  const flash = (msg, type = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  useEffect(() => {
    axios.get(`${API}/api/admin/users`, { headers: h })
      .then((r) => setUsers(r.data))
      .catch(() => flash('Failed to load users', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`${API}/api/admin/users/${userId}`, { role: newRole }, { headers: h });
      flash('Role updated');
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch { flash('Failed to update role', 'error'); }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await axios.delete(`${API}/api/admin/users/${userId}`, { headers: h });
      flash('User deleted');
      const newUsers = users.filter((u) => u.id !== userId);
      setUsers(newUsers);
      const newTotal = Math.max(1, Math.ceil(newUsers.length / PAGE_SIZE));
      if (page > newTotal) setPage(newTotal);
    } catch { flash('Failed to delete user', 'error'); }
  };

  const roleColor = (role) => ({ admin: 'bg-red-100 text-red-800', dispatcher: 'bg-blue-100 text-blue-800', student: 'bg-green-100 text-green-800' }[role] || 'bg-gray-100 text-gray-800');

  if (loading) return <Spinner />;
  return (
    <div>
      <FlashBanner error={error} success={success} />
      {users.length === 0 ? (
        <EmptyState>No users yet</EmptyState>
      ) : (
        <div className="space-y-4">
          {paginated.map((u) => (
            <div key={u.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">{u.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${roleColor(u.role)}`}>{u.role}</span>
                  <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white">
                    <option value="student">Student</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => handleDelete(u.id)}
                    className="text-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 px-4 py-1 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-sm px-6 py-4">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="text-sm px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Buildings Tab ────────────────────────────────────────────────────────────

function BuildingsTab({ token }) {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const h = { Authorization: `Bearer ${token}` };

  const flash = (msg, type = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  useEffect(() => {
    axios.get(`${API}/api/admin/buildings`, { headers: h })
      .then((r) => setBuildings(r.data))
      .catch(() => flash('Failed to load buildings', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const r = await axios.post(`${API}/api/admin/buildings`, { name: newName }, { headers: h });
      setBuildings((prev) => [...prev, r.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      flash('Building added');
    } catch (err) { flash(err.response?.data?.message || 'Failed to add building', 'error'); }
    finally { setAdding(false); }
  };

  const handleToggleActive = async (b) => {
    try {
      const r = await axios.patch(`${API}/api/admin/buildings/${b.id}`, { active: !b.active }, { headers: h });
      setBuildings((prev) => prev.map((x) => x.id === b.id ? r.data : x));
    } catch { flash('Failed to update building', 'error'); }
  };

  const handleSaveName = async (b) => {
    if (!editName.trim() || editName.trim() === b.name) { setEditId(null); return; }
    try {
      const r = await axios.patch(`${API}/api/admin/buildings/${b.id}`, { name: editName.trim() }, { headers: h });
      setBuildings((prev) => prev.map((x) => x.id === b.id ? r.data : x).sort((a, b2) => a.name.localeCompare(b2.name)));
      setEditId(null);
      flash('Building updated');
    } catch (err) { flash(err.response?.data?.message || 'Failed to update building', 'error'); }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Deactivate "${b.name}"?`)) return;
    try {
      const r = await axios.delete(`${API}/api/admin/buildings/${b.id}`, { headers: h });
      setBuildings((prev) => prev.map((x) => x.id === b.id ? r.data : x));
      flash('Building deactivated');
    } catch { flash('Failed to deactivate building', 'error'); }
  };

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <FlashBanner error={error} success={success} />
      <form onSubmit={handleAdd} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Add building</h3>
        <div className="flex gap-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Building name"
            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
          <button type="submit" disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors">
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
        {buildings.map((b) => (
          <div key={b.id} className={`flex items-center gap-3 px-5 py-4 ${!b.active ? 'opacity-50' : ''}`}>
            {editId === b.id ? (
              <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(b); if (e.key === 'Escape') setEditId(null); }}
                className="flex-1 border border-blue-400 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
            ) : (
              <span className="flex-1 text-sm text-gray-800 dark:text-white">{b.name}</span>
            )}
            <div className="flex items-center gap-2 shrink-0">
              {editId === b.id ? (
                <>
                  <button onClick={() => handleSaveName(b)} className="text-xs text-green-600 dark:text-green-400 font-medium hover:underline">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <button onClick={() => { setEditId(b.id); setEditName(b.name); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
              )}
              <button onClick={() => handleToggleActive(b)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${b.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${b.active ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <button onClick={() => handleDelete(b)} className="text-xs text-red-500 dark:text-red-400 hover:underline">Remove</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Inactive buildings are hidden from students but can be re-enabled with the toggle.</p>
    </div>
  );
}

// ── Templates Tab ────────────────────────────────────────────────────────────

const WIZARD_CATEGORIES = ['lockout', 'maintenance', 'electrical', 'plumbing', 'pest'];
const CATEGORY_LABEL_MAP = { lockout: 'Lockout / Access', maintenance: 'Maintenance', electrical: 'Electrical', plumbing: 'Plumbing', pest: 'Pest Control' };

function TemplatesTab({ token }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openCats, setOpenCats] = useState({ lockout: true });
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [addCat, setAddCat] = useState(null);
  const [addData, setAddData] = useState({ title: '', subtitle: '', description: '' });
  const [dragOver, setDragOver] = useState(null);
  const dragSrc = useRef(null);
  const h = { Authorization: `Bearer ${token}` };

  const flash = (msg, type = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  useEffect(() => {
    axios.get(`${API}/api/admin/ticket-templates`, { headers: h })
      .then((r) => setTemplates(r.data))
      .catch(() => flash('Failed to load templates', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byCategory = (cat) => templates.filter((t) => t.category === cat).sort((a, b) => a.display_order - b.display_order);

  const handleToggle = async (tpl) => {
    try {
      const r = await axios.patch(`${API}/api/admin/ticket-templates/${tpl.id}`, { active: !tpl.active }, { headers: h });
      setTemplates((prev) => prev.map((t) => t.id === tpl.id ? r.data : t));
    } catch { flash('Failed to update template', 'error'); }
  };

  const handleDelete = async (tpl) => {
    if (!window.confirm(`Deactivate "${tpl.title}"?`)) return;
    try {
      const r = await axios.patch(`${API}/api/admin/ticket-templates/${tpl.id}`, { active: false }, { headers: h });
      setTemplates((prev) => prev.map((t) => t.id === tpl.id ? r.data : t));
      flash('Template deactivated');
    } catch { flash('Failed to deactivate template', 'error'); }
  };

  const startEdit = (tpl) => {
    setEditId(tpl.id);
    setEditData({ title: tpl.title, subtitle: tpl.subtitle || '', description: tpl.description });
  };

  const saveEdit = async (tpl) => {
    try {
      const r = await axios.patch(`${API}/api/admin/ticket-templates/${tpl.id}`, editData, { headers: h });
      setTemplates((prev) => prev.map((t) => t.id === tpl.id ? r.data : t));
      setEditId(null);
      flash('Template updated');
    } catch { flash('Failed to update template', 'error'); }
  };

  const handleAdd = async (cat) => {
    if (!addData.title.trim() || !addData.description.trim()) return;
    try {
      const r = await axios.post(`${API}/api/admin/ticket-templates`, { category: cat, ...addData }, { headers: h });
      setTemplates((prev) => [...prev, r.data]);
      setAddCat(null);
      setAddData({ title: '', subtitle: '', description: '' });
      flash('Template added');
    } catch { flash('Failed to add template', 'error'); }
  };

  // Drag-and-drop reorder within a category
  const handleDragStart = (idx, cat) => { dragSrc.current = { idx, cat }; };
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOver(idx); };
  const handleDrop = async (targetIdx, cat) => {
    setDragOver(null);
    if (!dragSrc.current || dragSrc.current.cat !== cat) return;
    const { idx: srcIdx } = dragSrc.current;
    if (srcIdx === targetIdx) return;
    const items = byCategory(cat);
    const reordered = [...items];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    // Update local state immediately
    const updated = reordered.map((t, i) => ({ ...t, display_order: i + 1 }));
    setTemplates((prev) => {
      const others = prev.filter((t) => t.category !== cat);
      return [...others, ...updated];
    });
    // Persist each changed display_order
    await Promise.all(
      updated
        .filter((t, i) => t.display_order !== items[i]?.display_order)
        .map((t) => axios.patch(`${API}/api/admin/ticket-templates/${t.id}`, { display_order: t.display_order }, { headers: h }).catch(() => {}))
    );
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <FlashBanner error={error} success={success} />
      {WIZARD_CATEGORIES.map((cat) => {
        const items = byCategory(cat);
        const isOpen = !!openCats[cat];
        return (
          <div key={cat} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Accordion header */}
            <button
              onClick={() => setOpenCats((o) => ({ ...o, [cat]: !o[cat] }))}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div>
                <span className="font-semibold text-gray-800 dark:text-white">{CATEGORY_LABEL_MAP[cat]}</span>
                <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{items.filter((t) => t.active).length} active</span>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-gray-700">
                {items.map((tpl, idx) => (
                  <div
                    key={tpl.id}
                    draggable
                    onDragStart={() => handleDragStart(idx, cat)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx, cat)}
                    onDragEnd={() => setDragOver(null)}
                    className={`border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${!tpl.active ? 'opacity-50' : ''} ${dragOver === idx ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    {editId === tpl.id ? (
                      <div className="px-5 py-4 space-y-2">
                        <input value={editData.title} onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
                          placeholder="Title" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        <input value={editData.subtitle} onChange={(e) => setEditData((d) => ({ ...d, subtitle: e.target.value }))}
                          placeholder="Subtitle (optional)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                        <textarea value={editData.description} onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                          placeholder="Full description sent with ticket" rows={3}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(tpl)} className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline px-2">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-5 py-4">
                        {/* Drag handle */}
                        <span className="cursor-grab text-gray-300 dark:text-gray-600 shrink-0" title="Drag to reorder">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="18" x2="16" y2="18" />
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{tpl.title}</p>
                          {tpl.subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{tpl.subtitle}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => startEdit(tpl)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                          <button onClick={() => handleToggle(tpl)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tpl.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${tpl.active ? 'translate-x-5' : 'translate-x-1'}`} />
                          </button>
                          <button onClick={() => handleDelete(tpl)} className="text-xs text-red-500 dark:text-red-400 hover:underline">Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add new template for this category */}
                {addCat === cat ? (
                  <div className="px-5 py-4 space-y-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                    <input value={addData.title} onChange={(e) => setAddData((d) => ({ ...d, title: e.target.value }))}
                      placeholder="Title" autoFocus className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                    <input value={addData.subtitle} onChange={(e) => setAddData((d) => ({ ...d, subtitle: e.target.value }))}
                      placeholder="Subtitle (optional)" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                    <textarea value={addData.description} onChange={(e) => setAddData((d) => ({ ...d, description: e.target.value }))}
                      placeholder="Full description sent with ticket" rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => handleAdd(cat)} disabled={!addData.title.trim() || !addData.description.trim()}
                        className="text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium disabled:opacity-40 transition-colors">Add</button>
                      <button onClick={() => setAddCat(null)} className="text-xs text-gray-500 dark:text-gray-400 hover:underline px-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setAddCat(cat); setAddData({ title: '', subtitle: '', description: '' }); }}
                    className="w-full text-left px-5 py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-t border-gray-100 dark:border-gray-700">
                    + Add template
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────

const SLA_CATEGORY_LABELS = {
  sla_hours_campus_safety: 'Campus Safety',
  sla_hours_maintenance: 'Maintenance',
  sla_hours_it: 'IT',
  sla_hours_cleaning: 'Cleaning',
  sla_hours_other: 'Other',
};

function SettingsTab({ token }) {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState({});
  const h = { Authorization: `Bearer ${token}` };

  const flash = (msg, type = 'success') => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  };

  useEffect(() => {
    axios.get(`${API}/api/admin/settings`, { headers: h })
      .then((r) => {
        setSettings(r.data);
        const init = {};
        r.data.forEach((s) => { init[s.key] = s.value; });
        setValues(init);
      })
      .catch(() => flash('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (key) => {
    setSaving((p) => ({ ...p, [key]: true }));
    try {
      await axios.patch(`${API}/api/admin/settings/${key}`, { value: values[key] }, { headers: h });
      flash('Saved');
    } catch { flash('Failed to save', 'error'); }
    finally { setSaving((p) => ({ ...p, [key]: false })); }
  };

  if (loading) return <Spinner />;

  const slaKeys = Object.keys(SLA_CATEGORY_LABELS);
  const otherSettings = settings.filter((s) => !slaKeys.includes(s.key));

  return (
    <div className="space-y-6">
      <FlashBanner error={error} success={success} />

      {/* General settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
        {otherSettings.map((s) => (
          <div key={s.key} className="px-5 py-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">{s.label}</label>
            <div className="flex gap-3">
              <input type="text" value={values[s.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
              <button onClick={() => handleSave(s.key)} disabled={saving[s.key]}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors">
                {saving[s.key] ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SLA / Response time targets */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">Response time targets</h3>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
          {slaKeys.map((key) => (
            <div key={key} className="flex items-center gap-3 px-5 py-4">
              <span className="flex-1 text-sm text-gray-800 dark:text-white">{SLA_CATEGORY_LABELS[key]}</span>
              <div className="flex items-center gap-2">
                <input type="number" min="0.1" step="0.5" value={values[key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                  className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white" />
                <span className="text-sm text-gray-500 dark:text-gray-400">hrs</span>
                <button onClick={() => handleSave(key)} disabled={saving[key]}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition-colors">
                  {saving[key] ? '…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 px-1 mt-2">Used for overdue detection in triage and expected response time shown to students.</p>
      </div>
    </div>
  );
}

// ── Shared helpers ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
      <p className="text-gray-400 dark:text-gray-500 text-lg">{children}</p>
    </div>
  );
}

function FlashBanner({ error, success }) {
  return (
    <>
      {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm">{success}</div>}
    </>
  );
}

// ── Main Admin Page ──────────────────────────────────────────────────────────

function Admin() {
  const [tab, setTab] = useState('users');
  const { user, token, logout } = useAuth();

  const handleLogout = () => { logout(); window.location.href = '/'; };

  const tabs = [
    { id: 'users', label: 'Users' },
    { id: 'buildings', label: 'Buildings' },
    { id: 'templates', label: 'Templates' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Navbar>
        <span className="text-sm text-gray-600 dark:text-gray-300">Welcome, {user?.name}</span>
        <button onClick={() => window.location.href = '/dispatcher'} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Dispatcher</button>
        <button onClick={() => window.location.href = '/admin/reports'} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Reports</button>
        <button onClick={() => window.location.href = '/profile'} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium">Profile</button>
        <button onClick={handleLogout} className="text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors">Logout</button>
      </Navbar>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Admin Panel</h2>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit flex-wrap">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'users'     && <UsersTab token={token} />}
        {tab === 'buildings' && <BuildingsTab token={token} />}
        {tab === 'templates' && <TemplatesTab token={token} />}
        {tab === 'settings'  && <SettingsTab token={token} />}
      </div>
    </div>
  );
}

export default Admin;
