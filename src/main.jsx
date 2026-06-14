import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Brain,
  CheckCircle2,
  ClipboardList,
  Compass,
  DollarSign,
  Home,
  Inbox,
  Layers,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Users,
  X,
  AlertCircle,
  CalendarDays,
  Clock3,
  Flag,
  HelpCircle,
  ShieldCheck,
  Archive,
  ArrowRight,
  Save,
  Edit3,
  CircleDashed,
  Zap,
  Clock,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  ChevronDown,
  ChevronRight,
  ArrowUpCircle,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'command-center-v2';

// ─── Category tiers ────────────────────────────────────────────────────────
const categoryTiers = [
  {
    id: 'act-now',
    label: 'Act Now',
    description: 'Momentum — things with clear forward motion',
    color: 'tier-act',
  },
  {
    id: 'needs-thinking',
    label: 'Needs Thinking',
    description: 'Open loops — draining attention until closed',
    color: 'tier-think',
  },
  {
    id: 'hold',
    label: 'Hold / Background',
    description: 'Stable or parked — not this week',
    color: 'tier-hold',
  },
];

const categories = [
  {
    id: 'active-missions',
    label: 'Active Missions',
    short: 'Missions',
    icon: Target,
    color: 'amber',
    tier: 'act-now',
    description: 'The major priorities you are actively focused on right now. Keep this capped at 3.',
    prompt: 'What bigger priority does this connect to?',
  },
  {
    id: 'next-actions',
    label: 'Next Actions',
    short: 'Actions',
    icon: CheckCircle2,
    color: 'green',
    tier: 'act-now',
    description: 'Small specific tasks you can actually do right now.',
    prompt: 'What is the next physical action?',
  },
  {
    id: 'problems',
    label: 'Problems to Solve',
    short: 'Problems',
    icon: HelpCircle,
    color: 'orange',
    tier: 'needs-thinking',
    description: 'Things that need thinking, planning, or breaking down before action.',
    prompt: 'What question needs to be solved?',
  },
  {
    id: 'decisions',
    label: 'Decisions',
    short: 'Decisions',
    icon: Compass,
    color: 'purple',
    tier: 'needs-thinking',
    description: 'Open choices that are draining attention until you close them.',
    prompt: 'What options are you choosing between?',
  },
  {
    id: 'waiting-on',
    label: 'Waiting On',
    short: 'Waiting',
    icon: TimerReset,
    color: 'yellow',
    tier: 'needs-thinking',
    description: 'Things blocked by another person, answer, event, payment, or deadline.',
    prompt: 'Who or what are you waiting on?',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    short: 'Maintenance',
    icon: ShieldCheck,
    color: 'teal',
    tier: 'hold',
    description: 'The basic things that keep life stable: cleaning, hygiene, sleep, food, school basics.',
    prompt: 'What keeps this from becoming chaos?',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    short: 'People',
    icon: Users,
    color: 'pink',
    tier: 'hold',
    description: 'Gabi, family, siblings, friends, work relationships, networking, and conversations.',
    prompt: 'Who does this involve and what would showing up well look like?',
  },
  {
    id: 'money-adult-life',
    label: 'Money / Adult Life',
    short: 'Adult Life',
    icon: DollarSign,
    color: 'emerald',
    tier: 'hold',
    description: 'Money, forms, subscriptions, appointments, documents, car, school admin, and responsibilities.',
    prompt: 'What real-world responsibility needs clarity?',
  },
  {
    id: 'someday',
    label: 'Someday / Parking Lot',
    short: 'Someday',
    icon: Archive,
    color: 'slate',
    tier: 'hold',
    description: 'Good ideas that matter, but not right now.',
    prompt: 'Why is this not for this week?',
  },
  {
    id: 'anxiety-noise',
    label: 'Anxiety / Noise',
    short: 'Noise',
    icon: Brain,
    color: 'red',
    tier: 'hold',
    description: 'Fear loops, repeated worries, vague pressure, and thoughts with no clear action yet.',
    prompt: 'Is there a real action here, or is this a repeated worry loop?',
  },
];

const lifeAreas = ['Work', 'School', 'Money', 'Health', 'Relationships', 'Family', 'Personal', 'App/Projects', 'Future'];
const energyLevels = ['Low', 'Medium', 'High'];
const statuses = ['Open', 'On Track', 'Slipping', 'Blocked', 'Done'];

// ─── Staleness helper ──────────────────────────────────────────────────────
function getDaysOld(isoString) {
  if (!isoString) return 0;
  const ms = Date.now() - new Date(isoString).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function stalenessLabel(days, category) {
  if (category === 'waiting-on' && days >= 14) return { label: `${days}d — follow up?`, urgent: true };
  if (category === 'decisions' && days >= 7) return { label: `${days}d open`, urgent: true };
  if (category === 'problems' && days >= 10) return { label: `${days}d — needs attention`, urgent: days >= 14 };
  if (days >= 21) return { label: `${days}d — stale`, urgent: false };
  return null;
}

const starterState = {
  thoughts: [
    {
      id: crypto.randomUUID(),
      text: 'Figure out what deserves my attention this week instead of trying to fix everything at once.',
      category: 'problems',
      area: 'Personal',
      status: 'Open',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      nextAction: 'Pick 3 active priorities for the week.',
      notes: 'This app should reduce mental noise, not create another thing to manage.',
      dueDate: '',
      energy: 'Medium',
      pinned: true,
    },
  ],
  missions: [
    {
      id: crypto.randomUUID(),
      title: 'Build real-world value',
      why: 'Career, confidence, AI skills, Paragon, and future money all connect here.',
      weeklyGoal: 'Create one useful deliverable or system improvement.',
      nextAction: 'Define the highest-value work output for this week.',
      status: 'On Track',
      area: 'Work',
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Build body and discipline',
      why: 'Fitness, food, sleep, and consistency stabilize everything else.',
      weeklyGoal: 'Hit workouts and keep basic tracking consistent.',
      nextAction: 'Choose today\'s body win.',
      status: 'Open',
      area: 'Health',
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      title: 'Stabilize adult life',
      why: 'Money, school, relationships, and responsibilities stop becoming background stress.',
      weeklyGoal: 'Clear one adult-life open loop.',
      nextAction: 'Review money/adult-life list and choose one concrete action.',
      status: 'Open',
      area: 'Money',
      createdAt: new Date().toISOString(),
    },
  ],
  today: {
    mainMissionId: '',
    mainMissionText: 'Pick one thing that moves life forward today.',
    bodyWin: 'Do one action that keeps your body/life stable.',
    lifeWinId: '',
    lifeWinText: 'Clear one small real-life open loop.',
    avoiding: 'Name the thing you do not want to deal with.',
    updatedAt: new Date().toISOString(),
  },
  reviews: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return starterState;
    const parsed = JSON.parse(raw);
    return {
      ...starterState,
      ...parsed,
      thoughts: parsed.thoughts || [],
      missions: parsed.missions || starterState.missions,
      today: { ...starterState.today, ...(parsed.today || {}) },
      reviews: parsed.reviews || [],
    };
  } catch {
    return starterState;
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCategory(id) {
  return categories.find((c) => c.id === id) || categories[0];
}

function getTier(tierId) {
  return categoryTiers.find((t) => t.id === tierId) || categoryTiers[0];
}

// ─── UI Primitives ─────────────────────────────────────────────────────────
function Pill({ children, tone = 'default', className = '' }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}

function IconBadge({ icon: Icon, tone = 'amber' }) {
  return (
    <div className={`icon-badge icon-${tone}`}>
      <Icon size={18} />
    </div>
  );
}

function EmptyState({ icon: Icon = CircleDashed, title, text }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EnergyIcon({ level }) {
  if (level === 'Low') return <BatteryLow size={14} />;
  if (level === 'High') return <BatteryFull size={14} />;
  return <BatteryMedium size={14} />;
}

function StalenessTag({ thought }) {
  const days = getDaysOld(thought.createdAt);
  const info = stalenessLabel(days, thought.category);
  if (!info) return null;
  return <Pill tone={info.urgent ? 'red' : 'slate'}><Clock size={11} /> {info.label}</Pill>;
}

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  const [state, setState] = useState(loadState);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedCategory, setSelectedCategory] = useState('active-missions');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [energyFilter, setEnergyFilter] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const unsorted = state.thoughts.filter((t) => !t.category);
  const openTasks = state.thoughts.filter((t) => t.category === 'next-actions' && t.status !== 'Done');
  const openLoops = state.thoughts.filter((t) => ['problems', 'decisions', 'waiting-on'].includes(t.category) && t.status !== 'Done');
  const noiseItems = state.thoughts.filter((t) => t.category === 'anxiety-noise');

  const filteredThoughts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.thoughts
      .filter((t) => selectedCategory ? t.category === selectedCategory : true)
      .filter((t) => {
        if (!normalized) return true;
        return [t.text, t.area, t.notes, t.nextAction, t.status].join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.thoughts, selectedCategory, query]);

  // Energy-filtered tasks for "do right now" view
  const energyFilteredTasks = useMemo(() => {
    return openTasks.filter((t) => !energyFilter || t.energy === energyFilter);
  }, [openTasks, energyFilter]);

  function updateToday(key, value) {
    setState((prev) => ({
      ...prev,
      today: { ...prev.today, [key]: value, updatedAt: new Date().toISOString() },
    }));
  }

  function addThought(input) {
    const thought = {
      id: crypto.randomUUID(),
      text: input.text.trim(),
      category: input.category || '',
      area: input.area || 'Personal',
      status: input.status || 'Open',
      createdAt: new Date().toISOString(),
      nextAction: input.nextAction || '',
      notes: input.notes || '',
      dueDate: input.dueDate || '',
      energy: input.energy || 'Medium',
      pinned: false,
      relatedMissionId: input.relatedMissionId || '',
      decisionOptions: input.decisionOptions || '',
      waitingOn: input.waitingOn || '',
      truth: input.truth || '',
      exaggeration: input.exaggeration || '',
    };
    if (!thought.text) return;
    setState((prev) => ({ ...prev, thoughts: [thought, ...prev.thoughts] }));
    return thought;
  }

  function updateThought(id, patch) {
    setState((prev) => ({
      ...prev,
      thoughts: prev.thoughts.map((t) => t.id === id ? { ...t, ...patch } : t),
    }));
  }

  function deleteThought(id) {
    setState((prev) => ({ ...prev, thoughts: prev.thoughts.filter((t) => t.id !== id) }));
  }

  function addMission(input) {
    const mission = {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      why: input.why || '',
      weeklyGoal: input.weeklyGoal || '',
      nextAction: input.nextAction || '',
      status: input.status || 'Open',
      area: input.area || 'Personal',
      createdAt: new Date().toISOString(),
    };
    if (!mission.title) return;
    setState((prev) => ({ ...prev, missions: [mission, ...prev.missions] }));
  }

  function updateMission(id, patch) {
    setState((prev) => ({
      ...prev,
      missions: prev.missions.map((m) => m.id === id ? { ...m, ...patch } : m),
    }));
  }

  function deleteMission(id) {
    setState((prev) => ({ ...prev, missions: prev.missions.filter((m) => m.id !== id) }));
  }

  function saveReview(review) {
    setState((prev) => ({
      ...prev,
      reviews: [{ ...review, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev.reviews],
    }));
  }

  function convertThought(thought, conversion) {
    const patches = {
      task: { category: 'next-actions', status: 'Open' },
      problem: { category: 'problems', status: 'Open' },
      decision: { category: 'decisions', status: 'Open' },
      waiting: { category: 'waiting-on', status: 'Open' },
      relationship: { category: 'relationships', status: 'Open' },
      money: { category: 'money-adult-life', status: 'Open' },
      someday: { category: 'someday', status: 'Open' },
      noise: { category: 'anxiety-noise', status: 'Open' },
      maintenance: { category: 'maintenance', status: 'Open' },
      done: { status: 'Done' },
    };
    updateThought(thought.id, patches[conversion] || {});
  }

  // Promote a real task/mission into Today slots
  function promoteToToday(slot, id, text) {
    if (slot === 'main') updateToday('mainMissionId', id), updateToday('mainMissionText', text);
    if (slot === 'life') updateToday('lifeWinId', id), updateToday('lifeWinText', text);
  }

  const navItems = [
    { id: 'today', label: 'Today', icon: Home },
    { id: 'capture', label: 'Capture', icon: Plus },
    { id: 'sort', label: 'Sort', icon: Layers },
    { id: 'missions', label: 'Missions', icon: Target },
    { id: 'review', label: 'Review', icon: RefreshCw },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">BlakeOS</p>
          <h1>Command Center</h1>
        </div>
        <button className="primary-button compact" onClick={() => setModal({ type: 'quick-capture' })}>
          <Plus size={17} />
          <span>Capture</span>
        </button>
      </header>

      <main className="main-content">
        {activeTab === 'today' && (
          <TodayView
            today={state.today}
            updateToday={updateToday}
            missions={state.missions}
            openTasks={openTasks}
            openLoops={openLoops}
            noiseItems={noiseItems}
            energyFilter={energyFilter}
            setEnergyFilter={setEnergyFilter}
            energyFilteredTasks={energyFilteredTasks}
            setActiveTab={setActiveTab}
            setSelectedCategory={setSelectedCategory}
            setModal={setModal}
            updateThought={updateThought}
            promoteToToday={promoteToToday}
            allThoughts={state.thoughts}
          />
        )}
        {activeTab === 'capture' && <CaptureView addThought={addThought} missions={state.missions} setActiveTab={setActiveTab} />}
        {activeTab === 'sort' && (
          <SortView
            thoughts={state.thoughts}
            unsorted={unsorted}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            query={query}
            setQuery={setQuery}
            filteredThoughts={filteredThoughts}
            updateThought={updateThought}
            deleteThought={deleteThought}
            convertThought={convertThought}
            setModal={setModal}
          />
        )}
        {activeTab === 'missions' && (
          <MissionsView
            missions={state.missions}
            thoughts={state.thoughts}
            addMission={addMission}
            updateMission={updateMission}
            deleteMission={deleteMission}
            setActiveTab={setActiveTab}
            setSelectedCategory={setSelectedCategory}
          />
        )}
        {activeTab === 'review' && <ReviewView state={state} saveReview={saveReview} />}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={activeTab === item.id ? 'active' : ''} onClick={() => setActiveTab(item.id)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {modal?.type === 'quick-capture' && (
        <Modal title="Quick Capture" onClose={() => setModal(null)}>
          <CaptureForm
            addThought={(input) => { addThought(input); setModal(null); setActiveTab('sort'); }}
            missions={state.missions}
            compact
          />
        </Modal>
      )}

      {modal?.type === 'edit-thought' && (
        <Modal title="Edit Item" onClose={() => setModal(null)}>
          <ThoughtEditForm
            thought={modal.thought}
            missions={state.missions}
            updateThought={(id, patch) => { updateThought(id, patch); setModal(null); }}
          />
        </Modal>
      )}

      {modal?.type === 'promote' && (
        <Modal title={`Promote to Today's ${modal.slot === 'main' ? 'Main Mission' : 'Life Win'}`} onClose={() => setModal(null)}>
          <PromoteModal
            slot={modal.slot}
            missions={state.missions}
            tasks={openTasks}
            loops={openLoops}
            onSelect={(id, text) => { promoteToToday(modal.slot, id, text); setModal(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Today View ────────────────────────────────────────────────────────────
function TodayView({ today, updateToday, missions, openTasks, openLoops, noiseItems, energyFilter, setEnergyFilter, energyFilteredTasks, setActiveTab, setSelectedCategory, setModal, updateThought, promoteToToday, allThoughts }) {
  return (
    <section className="screen stack">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Daily Operating System</p>
          <h2>What deserves your attention?</h2>
          <p>Pick the few things that make today a win. Park everything else.</p>
        </div>
        <Sparkles size={32} className="hero-icon" />
      </div>

      {/* Today's 3 — promoted from real data */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Today's Focus</p>
            <h2>Today's 3</h2>
          </div>
          <Pill tone="slate">Updated {formatDate(today.updatedAt)}</Pill>
        </div>
        <div className="today-grid">
          <TodaySlot
            label="Main Mission"
            value={today.mainMissionText}
            onChange={(v) => updateToday('mainMissionText', v)}
            onPromote={() => setModal({ type: 'promote', slot: 'main' })}
            linkedId={today.mainMissionId}
          />
          <Field label="Body / Stability Win">
            <textarea value={today.bodyWin} onChange={(e) => updateToday('bodyWin', e.target.value)} />
          </Field>
          <TodaySlot
            label="Life Win"
            value={today.lifeWinText}
            onChange={(v) => updateToday('lifeWinText', v)}
            onPromote={() => setModal({ type: 'promote', slot: 'life' })}
            linkedId={today.lifeWinId}
          />
          <Field label="One Thing I'm Avoiding">
            <textarea value={today.avoiding} onChange={(e) => updateToday('avoiding', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Active missions */}
      <div className="section-header">
        <div>
          <p className="eyebrow">Active Missions</p>
          <h2>Where Momentum Lives</h2>
        </div>
        <button className="text-button" onClick={() => setActiveTab('missions')}>Manage</button>
      </div>
      <div className="mission-list">
        {missions.slice(0, 3).map((m) => (
          <article className="mission-card" key={m.id}>
            <div>
              <p className="eyebrow">{m.area}</p>
              <h3>{m.title}</h3>
              <p>{m.why || 'No why added yet.'}</p>
            </div>
            <Pill tone={m.status === 'On Track' ? 'green' : m.status === 'Slipping' ? 'red' : m.status === 'Blocked' ? 'red' : 'default'}>{m.status}</Pill>
          </article>
        ))}
        {missions.length === 0 && <EmptyState title="No missions yet" text="Go to Missions to set your top 3 priorities." />}
      </div>

      {/* Energy-based task filter — Feature 4 */}
      <div className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Do Right Now</p>
            <h2>Next Actions</h2>
          </div>
          <div className="energy-toggle">
            {['', 'Low', 'Medium', 'High'].map((level) => (
              <button
                key={level}
                className={`energy-btn ${energyFilter === level ? 'active' : ''}`}
                onClick={() => setEnergyFilter(level)}
              >
                {level === '' ? 'All' : <><EnergyIcon level={level} /> {level}</>}
              </button>
            ))}
          </div>
        </div>
        {energyFilteredTasks.length ? (
          <div className="compact-list">
            {energyFilteredTasks.slice(0, 6).map((task) => (
              <button
                key={task.id}
                className={`compact-item ${task.status === 'Done' ? 'done-item' : ''}`}
                onClick={() => updateThought(task.id, { status: task.status === 'Done' ? 'Open' : 'Done' })}
              >
                <CheckCircle2 size={17} className={task.status === 'Done' ? 'check-done' : ''} />
                <div className="compact-item-body">
                  <span>{task.text}</span>
                  <div className="compact-meta">
                    <EnergyIcon level={task.energy} />
                    <span className="meta-text">{task.energy}</span>
                    {task.dueDate && <><CalendarDays size={11} /><span className="meta-text">{formatDate(task.dueDate)}</span></>}
                  </div>
                </div>
              </button>
            ))}
            {openTasks.length > 6 && (
              <button className="text-button full-width" onClick={() => { setSelectedCategory('next-actions'); setActiveTab('sort'); }}>
                See all {openTasks.length} actions →
              </button>
            )}
          </div>
        ) : (
          <EmptyState title={energyFilter ? `No ${energyFilter.toLowerCase()} energy tasks` : 'No open actions'} text="Capture or convert a thought into a next action." />
        )}
      </div>

      {/* Open loops */}
      <div className="card">
        <div className="mini-header">
          <AlertCircle size={18} />
          <h3>Open Loops</h3>
          <Pill tone={openLoops.length > 0 ? 'orange' : 'green'} className="ml-auto">{openLoops.length}</Pill>
        </div>
        {openLoops.length ? (
          <div className="compact-list">
            {openLoops.slice(0, 5).map((loop) => {
              const cat = getCategory(loop.category);
              const days = getDaysOld(loop.createdAt);
              const stale = stalenessLabel(days, loop.category);
              return (
                <button key={loop.id} className="compact-item" onClick={() => { setSelectedCategory(loop.category); setActiveTab('sort'); }}>
                  <cat.icon size={17} />
                  <div className="compact-item-body">
                    <span>{loop.text}</span>
                    {stale && <span className={`stale-tag ${stale.urgent ? 'stale-urgent' : ''}`}><Clock size={11} /> {stale.label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="muted small">No open loops. Problems, decisions, and waiting items show here.</p>
        )}
      </div>

      {/* Noise card */}
      <div className="card noise-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Mental Noise</p>
            <h2>Worry Check</h2>
          </div>
          <button className="secondary-button compact" onClick={() => setModal({ type: 'quick-capture' })}>
            <Plus size={16} /> Add
          </button>
        </div>
        {noiseItems.length ? (
          <ThoughtCard thought={noiseItems[0]} updateThought={updateThought} compact />
        ) : (
          <p className="muted small">No noise entries yet. When a thought repeats with no clear action, put it here.</p>
        )}
      </div>
    </section>
  );
}

// ─── Today Slot — with promote button ─────────────────────────────────────
function TodaySlot({ label, value, onChange, onPromote, linkedId }) {
  return (
    <div className="today-slot">
      <div className="today-slot-header">
        <span className="field-label">{label}</span>
        <button className="promote-btn" onClick={onPromote} title="Pull from your actual tasks">
          <ArrowUpCircle size={14} /> Pull from list
        </button>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} className={linkedId ? 'linked-slot' : ''} />
    </div>
  );
}

// ─── Promote Modal ─────────────────────────────────────────────────────────
function PromoteModal({ slot, missions, tasks, loops, onSelect }) {
  return (
    <div className="promote-modal">
      <p className="muted small">Choose something from your actual lists to promote to today's focus.</p>
      {missions.length > 0 && (
        <div className="promote-group">
          <p className="promote-group-label">Active Missions</p>
          {missions.slice(0, 3).map((m) => (
            <button key={m.id} className="promote-item" onClick={() => onSelect(m.id, m.title)}>
              <Target size={15} />
              <span>{m.title}</span>
            </button>
          ))}
        </div>
      )}
      {tasks.length > 0 && (
        <div className="promote-group">
          <p className="promote-group-label">Next Actions</p>
          {tasks.slice(0, 5).map((t) => (
            <button key={t.id} className="promote-item" onClick={() => onSelect(t.id, t.text)}>
              <CheckCircle2 size={15} />
              <span>{t.text}</span>
            </button>
          ))}
        </div>
      )}
      {loops.length > 0 && (
        <div className="promote-group">
          <p className="promote-group-label">Open Loops</p>
          {loops.slice(0, 5).map((l) => {
            const cat = getCategory(l.category);
            return (
              <button key={l.id} className="promote-item" onClick={() => onSelect(l.id, l.text)}>
                <cat.icon size={15} />
                <span>{l.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Capture View ──────────────────────────────────────────────────────────
function CaptureView({ addThought, missions, setActiveTab }) {
  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Brain Dump</p>
          <h2>Capture</h2>
          <p className="muted">Get it out of your head. Sort later.</p>
        </div>
      </div>
      <CaptureForm addThought={(input) => { addThought(input); setActiveTab('sort'); }} missions={missions} />
    </section>
  );
}

function CaptureForm({ addThought, missions, compact = false }) {
  const [form, setForm] = useState({
    text: '', category: '', area: 'Personal', nextAction: '',
    notes: '', dueDate: '', energy: 'Medium', relatedMissionId: '',
  });

  const selected = form.category ? getCategory(form.category) : null;

  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  function submit(e) {
    e.preventDefault();
    if (!form.text.trim()) return;
    addThought(form);
    setForm({ text: '', category: '', area: 'Personal', nextAction: '', notes: '', dueDate: '', energy: 'Medium', relatedMissionId: '' });
  }

  return (
    <form className="capture-form card" onSubmit={submit}>
      <Field label="What is on your mind?">
        <textarea
          className="big-input"
          placeholder="Dump the thought here. Sorting can happen after."
          value={form.text}
          onChange={(e) => set('text', e.target.value)}
          autoFocus={compact}
        />
      </Field>

      <div className="form-grid">
        <Field label="Category">
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Unsorted Inbox</option>
            {categoryTiers.map((tier) => (
              <optgroup key={tier.id} label={tier.label}>
                {categories.filter((c) => c.tier === tier.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Life Area">
          <select value={form.area} onChange={(e) => set('area', e.target.value)}>
            {lifeAreas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>

      {selected && (
        <div className={`category-hint hint-${selected.color}`}>
          <selected.icon size={18} />
          <div>
            <strong>{selected.label}</strong>
            <p>{selected.prompt}</p>
          </div>
        </div>
      )}

      <Field label="Next Action / Clarifying Step">
        <input placeholder="What is the very next physical step?" value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
      </Field>

      <div className="form-grid">
        <Field label="Due / Follow-up Date">
          <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
        <Field label="Energy Required">
          <select value={form.energy} onChange={(e) => set('energy', e.target.value)}>
            {energyLevels.map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Related Mission">
        <select value={form.relatedMissionId} onChange={(e) => set('relatedMissionId', e.target.value)}>
          <option value="">None</option>
          {missions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </Field>

      <Field label="Notes">
        <textarea placeholder="Context, why it matters, anything you don't want to forget." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </Field>

      <button className="primary-button" type="submit">
        <Save size={17} /> Save to Command Center
      </button>
    </form>
  );
}

// ─── Sort View — tiered ────────────────────────────────────────────────────
function SortView({ thoughts, unsorted, selectedCategory, setSelectedCategory, query, setQuery, filteredThoughts, updateThought, deleteThought, convertThought, setModal }) {
  const [collapsedTiers, setCollapsedTiers] = useState({});

  function toggleTier(tierId) {
    setCollapsedTiers((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  }

  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Sort & Convert</p>
          <h2>Every Thought Gets a Role</h2>
          <p className="muted">Act, solve, decide, wait, maintain, park, or let go.</p>
        </div>
        <Pill tone={unsorted.length ? 'red' : 'green'}>{unsorted.length} unsorted</Pill>
      </div>

      {unsorted.length > 0 && (
        <div className="card inbox-triage">
          <div className="mini-header">
            <Inbox size={18} />
            <h3>Inbox — Sort These First</h3>
          </div>
          <div className="thought-list">
            {unsorted.slice(0, 3).map((t) => (
              <TriageCard key={t.id} thought={t} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />
            ))}
          </div>
        </div>
      )}

      {/* Tiered category navigation */}
      <div className="tier-nav">
        {categoryTiers.map((tier) => {
          const tierCats = categories.filter((c) => c.tier === tier.id);
          const isCollapsed = collapsedTiers[tier.id];
          return (
            <div key={tier.id} className={`tier-group tier-group-${tier.color}`}>
              <button className="tier-header" onClick={() => toggleTier(tier.id)}>
                <div>
                  <span className="tier-label">{tier.label}</span>
                  <span className="tier-desc">{tier.description}</span>
                </div>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              {!isCollapsed && (
                <div className="tier-chips">
                  {tierCats.map((cat) => {
                    const Icon = cat.icon;
                    const count = thoughts.filter((t) => t.category === cat.id).length;
                    const staleCt = thoughts.filter((t) => {
                      if (t.category !== cat.id || t.status === 'Done') return false;
                      const info = stalenessLabel(getDaysOld(t.createdAt), cat.id);
                      return info?.urgent;
                    }).length;
                    return (
                      <button
                        key={cat.id}
                        className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <Icon size={16} />
                        <span>{cat.short}</span>
                        <small>{count}</small>
                        {staleCt > 0 && <span className="stale-dot">{staleCt}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input placeholder="Search this category..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <CategoryDetail
        category={getCategory(selectedCategory)}
        thoughts={filteredThoughts}
        updateThought={updateThought}
        deleteThought={deleteThought}
        convertThought={convertThought}
        setModal={setModal}
      />
    </section>
  );
}

function CategoryDetail({ category, thoughts, updateThought, deleteThought, convertThought, setModal }) {
  const Icon = category.icon;
  return (
    <div className="card category-detail">
      <div className="section-header">
        <div className="category-title">
          <IconBadge icon={Icon} tone={category.color} />
          <div>
            <h2>{category.label}</h2>
            <p className="muted">{category.description}</p>
          </div>
        </div>
      </div>
      {thoughts.length ? (
        <div className="thought-list">
          {thoughts.map((t) => (
            <ThoughtCard key={t.id} thought={t} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here yet" text="Captured items sorted into this category will appear here." />
      )}
    </div>
  );
}

function TriageCard({ thought, updateThought, deleteThought, convertThought, setModal }) {
  return (
    <article className="thought-card triage">
      <div className="thought-main">
        <h3>{thought.text}</h3>
        <p>{thought.notes || 'Choose what this should become.'}</p>
      </div>
      <ConversionButtons thought={thought} convertThought={convertThought} />
      <div className="card-actions">
        <button className="text-button" onClick={() => setModal({ type: 'edit-thought', thought })}><Edit3 size={15} /> Edit</button>
        <button className="danger-button" onClick={() => deleteThought(thought.id)}><Trash2 size={15} /> Delete</button>
      </div>
    </article>
  );
}

function ThoughtCard({ thought, updateThought, deleteThought, convertThought, setModal, compact = false }) {
  const category = getCategory(thought.category);
  const Icon = category.icon;
  const days = getDaysOld(thought.createdAt);
  const stale = stalenessLabel(days, thought.category);

  return (
    <article className={`thought-card ${compact ? 'compact-card' : ''}`}>
      <div className="thought-topline">
        <div className="thought-labels">
          <Pill tone={category.color}><Icon size={13} /> {category.short}</Pill>
          <Pill tone="default">{thought.area}</Pill>
          {thought.dueDate && <Pill tone="yellow"><CalendarDays size={13} /> {formatDate(thought.dueDate)}</Pill>}
          {thought.energy && <Pill tone="default"><EnergyIcon level={thought.energy} /> {thought.energy}</Pill>}
          {stale && <Pill tone={stale.urgent ? 'red' : 'slate'}><Clock size={11} /> {stale.label}</Pill>}
        </div>
        <button className="icon-button" onClick={() => updateThought(thought.id, { pinned: !thought.pinned })} title="Pin">
          <Flag size={16} className={thought.pinned ? 'filled-flag' : ''} />
        </button>
      </div>

      <div className="thought-main">
        <h3>{thought.text}</h3>
        {thought.nextAction && (
          <p className="next-action"><ArrowRight size={15} /> {thought.nextAction}</p>
        )}
        {thought.notes && <p>{thought.notes}</p>}
        {thought.truth && <p><strong>Grounded truth:</strong> {thought.truth}</p>}
        {thought.exaggeration && <p><strong>Exaggeration:</strong> {thought.exaggeration}</p>}
      </div>

      {/* Noise → Action bridge — Feature 3 */}
      {thought.category === 'anxiety-noise' && !compact && (
        <div className="noise-bridge">
          <p className="noise-bridge-label">Is there a real action hiding here?</p>
          <button className="convert-action-btn" onClick={() => convertThought(thought, 'task')}>
            <Zap size={14} /> Yes — convert to task
          </button>
        </div>
      )}

      {!compact && <ConversionButtons thought={thought} convertThought={convertThought} />}

      <div className="card-actions">
        <select value={thought.status} onChange={(e) => updateThought(thought.id, { status: e.target.value })}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="text-button" onClick={() => setModal({ type: 'edit-thought', thought })}><Edit3 size={15} /> Edit</button>
        {deleteThought && <button className="danger-button" onClick={() => deleteThought(thought.id)}><Trash2 size={15} /> Delete</button>}
      </div>
    </article>
  );
}

function ConversionButtons({ thought, convertThought }) {
  const buttons = [
    { id: 'task', label: 'Task', icon: CheckCircle2 },
    { id: 'problem', label: 'Problem', icon: HelpCircle },
    { id: 'decision', label: 'Decision', icon: Compass },
    { id: 'waiting', label: 'Waiting', icon: TimerReset },
    { id: 'someday', label: 'Park It', icon: Archive },
    { id: 'noise', label: 'Noise', icon: Brain },
  ];
  return (
    <div className="convert-row">
      {buttons.map((b) => {
        const BIcon = b.icon;
        return (
          <button key={b.id} onClick={() => convertThought(thought, b.id)}>
            <BIcon size={13} /> {b.label}
          </button>
        );
      })}
    </div>
  );
}

function ThoughtEditForm({ thought, missions, updateThought }) {
  const [form, setForm] = useState({ ...thought });
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function submit(e) { e.preventDefault(); updateThought(thought.id, form); }

  return (
    <form className="capture-form" onSubmit={submit}>
      <Field label="Title / Thought">
        <textarea className="big-input" value={form.text} onChange={(e) => set('text', e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Category">
          <select value={form.category || ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">Unsorted</option>
            {categoryTiers.map((tier) => (
              <optgroup key={tier.id} label={tier.label}>
                {categories.filter((c) => c.tier === tier.id).map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Area">
          <select value={form.area || 'Personal'} onChange={(e) => set('area', e.target.value)}>
            {lifeAreas.map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Next Action">
        <input value={form.nextAction || ''} onChange={(e) => set('nextAction', e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Due / Follow-up">
          <input type="date" value={form.dueDate || ''} onChange={(e) => set('dueDate', e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.status || 'Open'} onChange={(e) => set('status', e.target.value)}>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Energy Required">
        <select value={form.energy || 'Medium'} onChange={(e) => set('energy', e.target.value)}>
          {energyLevels.map((l) => <option key={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Related Mission">
        <select value={form.relatedMissionId || ''} onChange={(e) => set('relatedMissionId', e.target.value)}>
          <option value="">None</option>
          {missions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </Field>
      {form.category === 'decisions' && (
        <Field label="Options">
          <textarea value={form.decisionOptions || ''} onChange={(e) => set('decisionOptions', e.target.value)} placeholder="Option A / Option B / Current leaning" />
        </Field>
      )}
      {form.category === 'waiting-on' && (
        <Field label="Waiting On">
          <input value={form.waitingOn || ''} onChange={(e) => set('waitingOn', e.target.value)} placeholder="Person, payment, email, answer..." />
        </Field>
      )}
      {form.category === 'anxiety-noise' && (
        <>
          <Field label="Grounded Truth">
            <textarea value={form.truth || ''} onChange={(e) => set('truth', e.target.value)} placeholder="What is actually true?" />
          </Field>
          <Field label="Exaggeration / Fear Loop">
            <textarea value={form.exaggeration || ''} onChange={(e) => set('exaggeration', e.target.value)} placeholder="What part is your brain exaggerating?" />
          </Field>
        </>
      )}
      <Field label="Notes">
        <textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      </Field>
      <button className="primary-button" type="submit"><Save size={17} /> Save Changes</button>
    </form>
  );
}

// ─── Missions View ─────────────────────────────────────────────────────────
function MissionsView({ missions, thoughts, addMission, updateMission, deleteMission, setActiveTab, setSelectedCategory }) {
  const [form, setForm] = useState({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work' });
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function submit(e) {
    e.preventDefault();
    addMission(form);
    setForm({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work' });
  }

  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Active Missions</p>
          <h2>Where Your Energy Goes</h2>
          <p className="muted">Cap at 3. More than that becomes clutter.</p>
        </div>
        <Pill tone={missions.length <= 3 ? 'green' : 'red'}>{missions.length}/3</Pill>
      </div>

      <div className="mission-list detailed">
        {missions.map((m) => {
          const related = thoughts.filter((t) => t.relatedMissionId === m.id && t.status !== 'Done');
          return (
            <article className="mission-detail-card" key={m.id}>
              <div className="mission-detail-top">
                <div>
                  <p className="eyebrow">{m.area}</p>
                  <h3>{m.title}</h3>
                </div>
                <select value={m.status} onChange={(e) => updateMission(m.id, { status: e.target.value })}>
                  {statuses.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <Field label="Why it matters">
                <textarea value={m.why} onChange={(e) => updateMission(m.id, { why: e.target.value })} />
              </Field>
              <Field label="This week's goal">
                <input value={m.weeklyGoal} onChange={(e) => updateMission(m.id, { weeklyGoal: e.target.value })} />
              </Field>
              <Field label="Next action">
                <input value={m.nextAction} onChange={(e) => updateMission(m.id, { nextAction: e.target.value })} />
              </Field>
              <div className="mission-footer">
                <button className="secondary-button compact" onClick={() => { setSelectedCategory('next-actions'); setActiveTab('sort'); }}>
                  <ClipboardList size={16} /> {related.length} related items
                </button>
                <button className="danger-button" onClick={() => deleteMission(m.id)}><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          );
        })}
      </div>

      <form className="card capture-form" onSubmit={submit}>
        <div className="mini-header"><Plus size={18} /><h3>Add Mission</h3></div>
        <Field label="Mission Name">
          <input placeholder="Build real-world AI value" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <Field label="Why it matters">
          <textarea value={form.why} onChange={(e) => set('why', e.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Area">
            <select value={form.area} onChange={(e) => set('area', e.target.value)}>
              {lifeAreas.map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {statuses.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <Field label="This week's goal">
          <input value={form.weeklyGoal} onChange={(e) => set('weeklyGoal', e.target.value)} />
        </Field>
        <Field label="Next action">
          <input value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} />
        </Field>
        <button className="primary-button" type="submit"><Target size={17} /> Add Mission</button>
      </form>
    </section>
  );
}

// ─── Review View ───────────────────────────────────────────────────────────
function ReviewView({ state, saveReview }) {
  const [review, setReview] = useState({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  function set(key, value) { setReview((prev) => ({ ...prev, [key]: value })); }
  function submit(e) {
    e.preventDefault();
    saveReview(review);
    setReview({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  }

  const counts = categories.map((c) => ({
    ...c,
    count: state.thoughts.filter((t) => t.category === c.id).length,
    staleCount: state.thoughts.filter((t) => {
      if (t.category !== c.id || t.status === 'Done') return false;
      return stalenessLabel(getDaysOld(t.createdAt), c.id)?.urgent;
    }).length,
  }));

  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Weekly Reset</p>
          <h2>Review & Reprioritize</h2>
          <p className="muted">This is where the app becomes a life system instead of a dumping ground.</p>
        </div>
      </div>

      <div className="stats-grid">
        {counts.map((item) => {
          const Icon = item.icon;
          return (
            <div className="stat-card" key={item.id}>
              <Icon size={16} />
              <strong>{item.count}</strong>
              <span>{item.short}</span>
              {item.staleCount > 0 && <span className="stat-stale">{item.staleCount} stale</span>}
            </div>
          );
        })}
      </div>

      <form className="card capture-form" onSubmit={submit}>
        <div className="mini-header"><RefreshCw size={18} /><h3>Sunday Life Reset</h3></div>
        <Field label="What improved this week?">
          <textarea value={review.improved} onChange={(e) => set('improved', e.target.value)} />
        </Field>
        <Field label="What did I avoid?">
          <textarea value={review.avoided} onChange={(e) => set('avoided', e.target.value)} />
        </Field>
        <Field label="What actually mattered?">
          <textarea value={review.mattered} onChange={(e) => set('mattered', e.target.value)} />
        </Field>
        <Field label="What kept stressing me out?">
          <textarea value={review.stress} onChange={(e) => set('stress', e.target.value)} />
        </Field>
        <Field label="Next week's 3 priorities">
          <textarea value={review.nextWeek} onChange={(e) => set('nextWeek', e.target.value)} placeholder={"1. ...\n2. ...\n3. ..."} />
        </Field>
        <button className="primary-button" type="submit"><Save size={17} /> Save Weekly Review</button>
      </form>

      <div className="card">
        <div className="mini-header"><Clock3 size={18} /><h3>Past Reviews</h3></div>
        {state.reviews.length ? (
          <div className="thought-list">
            {state.reviews.map((item) => (
              <article className="review-card" key={item.id}>
                <p className="eyebrow">{formatDate(item.createdAt)}</p>
                <h3>Next Week's 3</h3>
                <p>{item.nextWeek || 'No priorities written.'}</p>
                <details>
                  <summary>Open full review</summary>
                  <p><strong>Improved:</strong> {item.improved}</p>
                  <p><strong>Avoided:</strong> {item.avoided}</p>
                  <p><strong>Mattered:</strong> {item.mattered}</p>
                  <p><strong>Stress:</strong> {item.stress}</p>
                </details>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No reviews yet" text="Save your first weekly reset to start building clarity over time." />
        )}
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);
