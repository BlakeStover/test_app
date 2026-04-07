import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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
// ───────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: 'lockout',
    label: 'Lockout / Access',
    subtitle: 'Room or building access issues',
    Icon: LockIcon,
    isEmergency: false,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    subtitle: 'General repairs and upkeep',
    Icon: WrenchIcon,
    isEmergency: false,
  },
  {
    id: 'electrical',
    label: 'Electrical',
    subtitle: 'Power, lighting, and outlets',
    Icon: LightningIcon,
    isEmergency: false,
  },
  {
    id: 'plumbing',
    label: 'Plumbing',
    subtitle: 'Leaks, drains, and water issues',
    Icon: DropletIcon,
    isEmergency: false,
  },
  {
    id: 'pest',
    label: 'Pest Control',
    subtitle: 'Insects, rodents, infestations',
    Icon: BugIcon,
    isEmergency: false,
  },
  {
    id: 'emergency',
    label: 'Safety / Emergency',
    subtitle: 'Urgent safety concerns',
    Icon: SirenIcon,
    isEmergency: true,
  },
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

// ── Emergency Modal ──────────────────────────────────────────────────────────
function EmergencyModal({ onClose, token }) {
  const [calling, setCalling] = useState(false);
  const [ticketFired, setTicketFired] = useState(false);

  const handleCallNow = () => {
    if (!ticketFired) {
      setTicketFired(true);
      // Fire-and-forget background ticket
      // Note: DB category enum uses 'campus_safety'; priority enum uses 'urgent' (no 'critical' or 'emergency' enum values exist)
      axios
        .post(
          'http://localhost:5000/api/tickets',
          {
            title: 'Emergency call placed',
            description: 'Student initiated an emergency call via the app.',
            category: 'campus_safety',
            priority: 'urgent',
            status: 'open',
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .catch(() => {
          // Silent fail — student should still be able to complete the call
        });
    }
    // Open the phone dialer
    window.location.href = `tel:${CAMPUS_SAFETY_PHONE}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* Red header */}
      <div className="bg-red-600 dark:bg-red-700 px-6 pt-12 pb-8 text-center">
        <div className="flex justify-center mb-3 text-white">
          <SirenIcon />
        </div>
        <h2 className="text-2xl font-bold text-white">Safety / Emergency</h2>
        <p className="text-red-100 text-sm mt-1">Contact campus safety immediately</p>
      </div>

      {/* Body */}
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
              hover:bg-gray-50 dark:hover:bg-gray-700/50
              active:bg-gray-100 dark:active:bg-gray-700
              ${i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}
              ${cat.isEmergency ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}
            `}
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

// ── Wizard Shell ─────────────────────────────────────────────────────────────
function TicketWizard() {
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [step, setStep] = useState(1);
  const [showEmergency, setShowEmergency] = useState(false);

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
    setForm((f) => ({ ...f, category: cat.id }));
    setStep(2);
  };

  return (
    <>
      {/* Emergency modal — rendered outside normal wizard flow */}
      {showEmergency && (
        <EmergencyModal
          onClose={() => setShowEmergency(false)}
          token={token}
        />
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
            {/* Spacer to balance back arrow */}
            <div className="w-9" />
          </div>

          {/* Step content */}
          {step === 1 && (
            <Step1
              onSelect={handleCategorySelect}
              onEmergency={() => setShowEmergency(true)}
            />
          )}

          {/* Steps 2–4 are placeholders until future phases */}
          {step === 2 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">Step 2 coming soon</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default TicketWizard;
