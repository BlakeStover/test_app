import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  TEMPLATES,
  CATEGORY_DB_MAP,
  CATEGORY_DEFAULT_TITLE,
  CATEGORY_LABEL,
} from '../constants/wizardTemplates';

// ── Configurable constants ──────────────────────────────────────────────────
const CAMPUS_SAFETY_PHONE = '555-123-4567';
// ───────────────────────────────────────────────────────────────────────────

// ── SVG Icons ───────────────────────────────────────────────────────────────
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function WrenchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function DropletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
function BugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M8 2l1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
      <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z" />
      <path d="M12 20v-9" />
      <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
      <path d="M6 13H2" />
      <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
      <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
      <path d="M22 13h-4" />
      <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
    </svg>
  );
}
function SirenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <path d="M11.3 2.28A1 1 0 0 1 12 2a1 1 0 0 1 .7.28l7 6.37A1 1 0 0 1 20 9.5V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9.5a1 1 0 0 1 .3-.85z" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
// ───────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'lockout',     label: 'Lockout / Access',    subtitle: 'Room or building access issues',  Icon: LockIcon,     isEmergency: false },
  { id: 'maintenance', label: 'Maintenance',          subtitle: 'General repairs and upkeep',       Icon: WrenchIcon,   isEmergency: false },
  { id: 'electrical',  label: 'Electrical',           subtitle: 'Power, lighting, and outlets',     Icon: LightningIcon,isEmergency: false },
  { id: 'plumbing',    label: 'Plumbing',             subtitle: 'Leaks, drains, and water issues',  Icon: DropletIcon,  isEmergency: false },
  { id: 'pest',        label: 'Pest Control',         subtitle: 'Insects, rodents, infestations',   Icon: BugIcon,      isEmergency: false },
  { id: 'emergency',   label: 'Safety / Emergency',   subtitle: 'Urgent safety concerns',           Icon: SirenIcon,    isEmergency: true  },
];

// ── Progress Dots ────────────────────────────────────────────────────────────
function ProgressDots({ step, total = 4 }) {
  return (
    <div className="flex justify-center items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-6 h-2 bg-blue-600'
              : i + 1 < step
              ? 'w-2 h-2 bg-blue-400'
              : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

// ── Next Button ──────────────────────────────────────────────────────────────
function NextButton({ onClick, disabled, label = 'Next' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full mt-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-2xl transition-colors shadow-sm"
    >
      {label}
    </button>
  );
}

// ── Emergency Modal ──────────────────────────────────────────────────────────
function EmergencyModal({ onClose, token }) {
  const [ticketFired, setTicketFired] = useState(false);

  const handleCallNow = () => {
    if (!ticketFired) {
      setTicketFired(true);
      // Fire-and-forget background ticket
      // Note: DB category enum uses 'campus_safety'; priority enum uses 'urgent'
      // (no 'emergency' category or 'critical' priority exist in the DB enums)
      axios
        .post(
          'http://localhost:5000/api/tickets',
          {
            title: 'Emergency call placed',
            description: 'Student initiated an emergency call via the app.',
            category: 'campus_safety',
            priority: 'urgent',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(() => {});
    }
    window.location.href = `tel:${CAMPUS_SAFETY_PHONE}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      <div className="bg-red-600 dark:bg-red-700 px-6 pt-12 pb-8 text-center">
        <div className="flex justify-center mb-3 text-white">
          <SirenIcon />
        </div>
        <h2 className="text-2xl font-bold text-white">Safety / Emergency</h2>
        <p className="text-red-100 text-sm mt-1">Contact campus safety immediately</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Campus Safety</p>
        <p className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
          {CAMPUS_SAFETY_PHONE}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-10">Available 24 / 7</p>
        <button
          onClick={handleCallNow}
          className="w-full max-w-xs bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-lg py-4 rounded-2xl shadow-sm transition-colors mb-4"
        >
          Call now
        </button>
        <button
          onClick={onClose}
          className="w-full max-w-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-base py-4 rounded-2xl transition-colors hover:border-gray-400 dark:hover:border-gray-500"
        >
          Go back
        </button>
      </div>
    </div>
  );
}

// ── Step 1: Category Selector ────────────────────────────────────────────────
function Step1({ onSelect, onEmergency }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">What do you need help with?</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Choose the type of request</p>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => cat.isEmergency ? onEmergency() : onSelect(cat)}
            className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors
              hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700
              ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
          >
            <span className={`shrink-0 ${cat.isEmergency ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
              <cat.Icon />
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cat.isEmergency ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {cat.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.subtitle}</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Template Picker ──────────────────────────────────────────────────
function Step2({ form, setForm, onNext }) {
  const templates = TEMPLATES[form.category] || [];
  const [customDesc, setCustomDesc] = useState(form.template_id ? '' : form.description);

  const handleTemplateSelect = (tpl) => {
    setCustomDesc('');
    setForm((f) => ({ ...f, template_id: tpl.id, title: tpl.title, description: tpl.description }));
  };

  const handleCustomChange = (e) => {
    const val = e.target.value;
    setCustomDesc(val);
    setForm((f) => ({ ...f, template_id: null, description: val }));
  };

  const canAdvance = form.template_id !== null || customDesc.trim().length > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">What's the issue?</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Pick a common issue or describe it yourself</p>

      {/* Template list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-5">
        {templates.map((tpl, i) => {
          const selected = form.template_id === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => handleTemplateSelect(tpl)}
              className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-colors
                ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}
                ${selected
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700'
                }`}
            >
              {/* Selection indicator */}
              <span className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selected && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                  {tpl.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tpl.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom description */}
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 px-1">
        Or describe it yourself
      </label>
      <textarea
        value={customDesc}
        onChange={handleCustomChange}
        placeholder="Describe the issue in your own words…"
        rows={4}
        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm"
      />

      <NextButton onClick={onNext} disabled={!canAdvance} />
    </div>
  );
}

// ── Step 3: Location & Photo ─────────────────────────────────────────────────
function Step3({ form, setForm, photoPreview, setPhotoPreview, onNext }) {
  const [buildings, setBuildings] = useState([]);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/buildings')
      .then((res) => setBuildings(res.data))
      .catch(() => {});
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setForm((f) => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
    // Reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setForm((f) => ({ ...f, photo: null }));
    setPhotoPreview(null);
  };

  const canAdvance = form.building.trim().length > 0 && form.room_number.trim().length > 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Where is this?</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Confirm your location and add a photo if helpful</p>

      {/* Building */}
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 px-1">
        Building
      </label>
      <select
        value={form.building}
        onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm mb-4 appearance-none"
      >
        <option value="">Select a building…</option>
        {buildings.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      {/* Room number */}
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 px-1">
        Room number
      </label>
      <input
        type="text"
        value={form.room_number}
        onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
        placeholder="e.g. 204"
        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm mb-4"
      />

      {/* Additional notes */}
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 px-1">
        Additional notes <span className="normal-case font-normal">(optional)</span>
      </label>
      <textarea
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        placeholder="Anything else we should know…"
        rows={3}
        className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none shadow-sm mb-5"
      />

      {/* Photo */}
      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 px-1">
        Photo <span className="normal-case font-normal">(optional)</span>
      </label>

      {photoPreview ? (
        <div className="mb-4">
          <div className="relative inline-block">
            <img
              src={photoPreview}
              alt="Selected"
              className="w-24 h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700"
            />
            <button
              onClick={removePhoto}
              className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 dark:bg-gray-600 text-white rounded-full flex items-center justify-center text-xs leading-none hover:bg-gray-800 transition-colors"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 mb-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-2xl py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Take photo
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-2xl py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Upload image
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraRef}  type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={handlePhotoChange} />
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />

      {!photoPreview && (
        <button
          onClick={onNext}
          className="w-full text-sm text-gray-400 dark:text-gray-500 py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Skip — no photo needed
        </button>
      )}

      <NextButton onClick={onNext} disabled={!canAdvance} />
    </div>
  );
}

// ── Step 4: Confirm & Submit ─────────────────────────────────────────────────
function Step4({ form, photoPreview, onEditAll, onSubmit, submitting, error }) {
  const effectiveTitle = form.title || CATEGORY_DEFAULT_TITLE[form.category] || 'New Request';

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Review your request</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Make sure everything looks right</p>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden mb-6">
        <SummaryRow label="Category" value={CATEGORY_LABEL[form.category] || form.category} />
        <SummaryRow label="Issue" value={effectiveTitle} />
        <SummaryRow label="Building" value={form.building} />
        <SummaryRow label="Room" value={form.room_number} />
        <SummaryRow label="Notes" value={form.notes || 'None'} dimEmpty />
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Photo</p>
          {photoPreview ? (
            <img src={photoPreview} alt="Attached" className="w-20 h-20 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">None</p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-2xl transition-colors shadow-sm mb-3"
      >
        {submitting ? 'Submitting…' : 'Submit request'}
      </button>
      <button
        onClick={onEditAll}
        disabled={submitting}
        className="w-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-base py-4 rounded-2xl transition-colors hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-40"
      >
        Edit something
      </button>
    </div>
  );
}

function SummaryRow({ label, value, dimEmpty }) {
  const isEmpty = !value || value === 'None';
  return (
    <div className="border-t border-gray-100 dark:border-gray-700 first:border-t-0 px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-sm ${dimEmpty && isEmpty ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
        {value || 'None'}
      </p>
    </div>
  );
}

// ── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ ticketId }) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-green-500 dark:text-green-400 mb-4">
        <CheckCircleIcon />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request submitted</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your request has been received.</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-10">
        Ticket #{ticketId}
      </p>
      <button
        onClick={() => window.location.href = '/dashboard'}
        className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-base py-4 rounded-2xl transition-colors shadow-sm mb-3"
      >
        Back to home
      </button>
      <button
        onClick={() => window.location.href = `/ticket?id=${ticketId}`}
        className="w-full max-w-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium text-base py-4 rounded-2xl transition-colors hover:border-gray-400 dark:hover:border-gray-500"
      >
        Track this ticket
      </button>
    </div>
  );
}

// ── Wizard Shell ─────────────────────────────────────────────────────────────
function TicketWizard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [step, setStep] = useState(1);
  const [showEmergency, setShowEmergency] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedTicketId, setSubmittedTicketId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    category: '',
    template_id: null,
    title: '',
    description: '',
    building: user?.building || '',
    room_number: user?.room_number || '',
    notes: '',
    photo: null,
  });

  const handleBack = () => {
    if (step === 1) {
      navigate('/dashboard');
    } else {
      setStep((s) => s - 1);
    }
  };

  const handleCategorySelect = (cat) => {
    setForm((f) => ({ ...f, category: cat.id, template_id: null, title: '', description: '' }));
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      let photoFilename = null;

      // 1. Upload photo if one was selected
      if (form.photo) {
        const formData = new FormData();
        formData.append('photo', form.photo);
        const uploadRes = await axios.post('http://localhost:5000/api/uploads', formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        photoFilename = uploadRes.data.filename;
      }

      // 2. Build description — embed location and optional notes
      const effectiveTitle = form.title || CATEGORY_DEFAULT_TITLE[form.category] || 'New Request';
      const locationLine = `\n\nLocation: ${form.building}, Room ${form.room_number}`;
      const notesLine = form.notes.trim() ? `\nAdditional notes: ${form.notes.trim()}` : '';
      const fullDescription = (form.description || effectiveTitle) + locationLine + notesLine;

      // 3. Submit ticket
      const ticketRes = await axios.post(
        'http://localhost:5000/api/tickets',
        {
          title: effectiveTitle,
          description: fullDescription,
          category: CATEGORY_DB_MAP[form.category] || 'other',
          priority: 'normal',
          photo_filename: photoFilename,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSubmittedTicketId(ticketRes.data.id);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show success screen after submission
  if (submittedTicketId) {
    return <SuccessScreen ticketId={submittedTicketId} />;
  }

  return (
    <>
      {showEmergency && (
        <EmergencyModal onClose={() => setShowEmergency(false)} token={token} />
      )}

      <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Header row */}
          <div className="flex items-center mb-6">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeftIcon />
            </button>
            <div className="flex-1">
              <ProgressDots step={step} total={4} />
            </div>
            <div className="w-9" />
          </div>

          {/* Step content */}
          {step === 1 && (
            <Step1
              onSelect={handleCategorySelect}
              onEmergency={() => setShowEmergency(true)}
            />
          )}
          {step === 2 && (
            <Step2
              form={form}
              setForm={setForm}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              form={form}
              setForm={setForm}
              photoPreview={photoPreview}
              setPhotoPreview={setPhotoPreview}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <Step4
              form={form}
              photoPreview={photoPreview}
              onEditAll={() => setStep(1)}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={submitError}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default TicketWizard;
