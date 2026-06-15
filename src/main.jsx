import React, { useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Brain,
  CheckCircle2,
  ClipboardList,
  Compass,
  DollarSign,
  Heart,
  Home,
  Inbox,
  Layers,
  ListChecks,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  Users,
  Wand2,
  X,
  AlertCircle,
  CalendarDays,
  Clock3,
  Flag,
  HelpCircle,
  PauseCircle,
  ShieldCheck,
  Archive,
  ArrowRight,
  Save,
  Edit3,
  Check,
  MoreHorizontal,
  CircleDashed,
  MoonStar,
  Copy,
  ClipboardCheck,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'command-center-v1';

const categories = [
  {
    id: 'active-missions',
    label: 'Active Missions',
    short: 'Missions',
    icon: Target,
    color: 'blue',
    description: 'The major priorities you are actively focused on right now. Keep this capped at 3.',
    prompt: 'What bigger priority does this connect to?',
  },
  {
    id: 'next-actions',
    label: 'Next Actions',
    short: 'Actions',
    icon: CheckCircle2,
    color: 'green',
    description: 'Small specific tasks you can actually do.',
    prompt: 'What is the next physical action?',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    short: 'Maintenance',
    icon: ShieldCheck,
    color: 'teal',
    description: 'The basic things that keep life stable: cleaning, hygiene, sleep, food, school basics.',
    prompt: 'What keeps this from becoming chaos?',
  },
  {
    id: 'problems',
    label: 'Problems to Solve',
    short: 'Problems',
    icon: HelpCircle,
    color: 'orange',
    description: 'Things that need thinking, planning, or breaking down before action.',
    prompt: 'What question needs to be solved?',
  },
  {
    id: 'decisions',
    label: 'Decisions',
    short: 'Decisions',
    icon: Compass,
    color: 'purple',
    description: 'Open choices that are draining attention until you close them.',
    prompt: 'What options are you choosing between?',
  },
  {
    id: 'waiting-on',
    label: 'Waiting On',
    short: 'Waiting',
    icon: TimerReset,
    color: 'yellow',
    description: 'Things blocked by another person, answer, event, payment, email, appointment, or deadline.',
    prompt: 'Who or what are you waiting on?',
  },
  {
    id: 'someday',
    label: 'Someday / Parking Lot',
    short: 'Someday',
    icon: Archive,
    color: 'slate',
    description: 'Good ideas that matter, but not right now.',
    prompt: 'Why is this not for this week?',
  },
  {
    id: 'relationships',
    label: 'Relationships',
    short: 'People',
    icon: Users,
    color: 'pink',
    description: 'Gabi, family, siblings, friends, work relationships, networking, and conversations.',
    prompt: 'Who does this involve and what would showing up well look like?',
  },
  {
    id: 'money-adult-life',
    label: 'Money / Adult Life',
    short: 'Adult Life',
    icon: DollarSign,
    color: 'emerald',
    description: 'Money, forms, subscriptions, appointments, documents, car, school admin, and responsibilities.',
    prompt: 'What real-world responsibility needs clarity?',
  },
  {
    id: 'anxiety-noise',
    label: 'Anxiety / Noise',
    short: 'Noise',
    icon: Brain,
    color: 'red',
    description: 'Fear loops, repeated worries, vague pressure, and thoughts with no clear action yet.',
    prompt: 'Is there a real action here, or is this a repeated worry loop?',
  },
];

const lifeAreas = ['Work', 'School', 'Money', 'Health', 'Relationships', 'Family', 'Personal', 'App/Projects', 'Future'];
const energyLevels = ['Low', 'Medium', 'High'];
const statuses = ['Open', 'On Track', 'Slipping', 'Blocked', 'Done'];

const starterState = {
  thoughts: [
    {
      id: crypto.randomUUID(),
      text: 'Figure out what deserves my attention this week instead of trying to fix everything at once.',
      category: 'problems',
      area: 'Personal',
      status: 'Open',
      createdAt: new Date().toISOString(),
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
      nextAction: 'Choose today’s body win.',
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
    mainMission: 'Pick one thing that moves life forward today.',
    bodyWin: 'Do one action that keeps your body/life stable.',
    lifeWin: 'Clear one small real-life open loop.',
    avoiding: 'Name the thing you do not want to deal with.',
    updatedAt: new Date().toISOString(),
  },
  reviews: [],
  dayReviews: [],
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
      today: parsed.today || starterState.today,
      reviews: parsed.reviews || [],
      dayReviews: parsed.dayReviews || [],
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
  return categories.find((category) => category.id === id) || categories[0];
}

function Pill({ children, tone = 'default', className = '' }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}

function IconBadge({ icon: Icon, tone = 'blue' }) {
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
      <div className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
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

function App() {
  const [state, setState] = useState(loadState);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedCategory, setSelectedCategory] = useState('active-missions');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const unsorted = state.thoughts.filter((thought) => !thought.category);
  const openTasks = state.thoughts.filter((thought) => thought.category === 'next-actions' && thought.status !== 'Done');
  const openLoops = state.thoughts.filter((thought) => ['problems', 'decisions', 'waiting-on'].includes(thought.category) && thought.status !== 'Done');
  const noiseItems = state.thoughts.filter((thought) => thought.category === 'anxiety-noise');

  const filteredThoughts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return state.thoughts
      .filter((thought) => (selectedCategory ? thought.category === selectedCategory : true))
      .filter((thought) => {
        if (!normalized) return true;
        return [thought.text, thought.area, thought.notes, thought.nextAction, thought.status]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.thoughts, selectedCategory, query]);

  function updateToday(key, value) {
    setState((prev) => ({
      ...prev,
      today: {
        ...prev.today,
        [key]: value,
        updatedAt: new Date().toISOString(),
      },
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
      thoughts: prev.thoughts.map((thought) => (thought.id === id ? { ...thought, ...patch } : thought)),
    }));
  }

  function deleteThought(id) {
    setState((prev) => ({ ...prev, thoughts: prev.thoughts.filter((thought) => thought.id !== id) }));
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
      missions: prev.missions.map((mission) => (mission.id === id ? { ...mission, ...patch } : mission)),
    }));
  }

  function deleteMission(id) {
    setState((prev) => ({ ...prev, missions: prev.missions.filter((mission) => mission.id !== id) }));
  }

  function saveReview(review) {
    const saved = {
      ...review,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, reviews: [saved, ...prev.reviews] }));
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

  function saveDayReview(dayReview) {
    const saved = { ...dayReview, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setState((prev) => ({ ...prev, dayReviews: [saved, ...(prev.dayReviews || [])] }));
    return saved;
  }

  function buildDaySummary({ thoughts, missions, today, review }) {
    const isSameDay = (iso) => {
      if (!iso) return false;
      const d = new Date(iso);
      const now = new Date();
      return d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate();
    };

    const tasks = thoughts.filter(
      (t) => t.category === 'next-actions' && (isSameDay(t.createdAt) || t.status === 'Done')
    );
    const tasksDone = tasks.filter((t) => t.status === 'Done');
    const tasksOpen = tasks.filter((t) => t.status !== 'Done');

    const captured = thoughts.filter((t) => isSameDay(t.createdAt));

    const touchedIds = new Set(
      thoughts
        .filter((t) => t.relatedMissionId && isSameDay(t.createdAt))
        .map((t) => t.relatedMissionId)
    );
    const missionsTouched = missions.filter((m) => touchedIds.has(m.id));

    const dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

    const lines = [];
    lines.push(`Daily Review — ${dateLabel}`);
    lines.push('');

    if (review) {
      lines.push(`Did I get better today? ${review.verdict}  (Score ${review.score}/5)`);
      review.answers.forEach((a) => lines.push(`  ${a.hit ? '[x]' : '[ ]'} ${a.label}`));
      lines.push('');
    }

    if (today) {
      lines.push("Today's 3");
      if (today.mainMission) lines.push(`  Main: ${today.mainMission}`);
      if (today.bodyWin) lines.push(`  Body: ${today.bodyWin}`);
      if (today.lifeWin) lines.push(`  Life: ${today.lifeWin}`);
      if (today.avoiding) lines.push(`  Avoiding: ${today.avoiding}`);
      lines.push('');
    }

    lines.push(`Tasks worked on (${tasksDone.length} done, ${tasksOpen.length} still open)`);
    if (tasksDone.length) tasksDone.forEach((t) => lines.push(`  [x] ${t.text}`));
    if (tasksOpen.length) tasksOpen.forEach((t) => lines.push(`  [ ] ${t.text}`));
    if (!tasks.length) lines.push('  (none logged today)');
    lines.push('');

    lines.push(`Missions touched (${missionsTouched.length})`);
    if (missionsTouched.length) missionsTouched.forEach((m) => lines.push(`  - ${m.title}`));
    else lines.push('  (none)');
    lines.push('');

    lines.push(`New thoughts captured (${captured.length})`);
    if (captured.length) captured.forEach((t) => lines.push(`  - ${t.text}`));
    else lines.push('  (none)');
    lines.push('');

    lines.push('— My own review —');
    lines.push('');

    return lines.join('\n');
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
          Capture
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
            setActiveTab={setActiveTab}
            setSelectedCategory={setSelectedCategory}
            setModal={setModal}
            updateThought={updateThought}
          />
        )}

        {activeTab === 'capture' && <CaptureView addThought={addThought} missions={state.missions} setActiveTab={setActiveTab} />}

        {activeTab === 'sort' && (
          <SortView
            thoughts={state.thoughts}
            unsorted={unsorted}
            categories={categories}
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
            addThought={(input) => {
              addThought(input);
              setModal(null);
              setActiveTab('sort');
            }}
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
            updateThought={(id, patch) => {
              updateThought(id, patch);
              setModal(null);
            }}
          />
        </Modal>
      )}

      {modal?.type === 'close-the-day' && (
        <Modal title="Close the Day" onClose={() => setModal(null)}>
          <CloseTheDay
            thoughts={state.thoughts}
            missions={state.missions}
            today={state.today}
            buildDaySummary={buildDaySummary}
            saveDayReview={saveDayReview}
          />
        </Modal>
      )}
    </div>
  );
}

function TodayView({ today, updateToday, missions, openTasks, openLoops, noiseItems, setActiveTab, setSelectedCategory, setModal, updateThought }) {
  return (
    <section className="screen stack">
      <div className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Today’s Command</p>
          <h2>What deserves your attention?</h2>
          <p>Pick the few things that make today a win. Everything else gets sorted, parked, or reviewed later.</p>
        </div>
        <Sparkles size={34} />
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Daily Operating System</p>
            <h2>Today’s 3</h2>
          </div>
          <Pill tone="blue">Updated {formatDate(today.updatedAt)}</Pill>
        </div>
        <div className="today-grid">
          <Field label="Main Mission">
            <textarea value={today.mainMission} onChange={(event) => updateToday('mainMission', event.target.value)} />
          </Field>
          <Field label="Body / Stability Win">
            <textarea value={today.bodyWin} onChange={(event) => updateToday('bodyWin', event.target.value)} />
          </Field>
          <Field label="Life Win">
            <textarea value={today.lifeWin} onChange={(event) => updateToday('lifeWin', event.target.value)} />
          </Field>
          <Field label="One Thing I’m Avoiding">
            <textarea value={today.avoiding} onChange={(event) => updateToday('avoiding', event.target.value)} />
          </Field>
        </div>
      </div>

      <div className="section-header">
        <div>
          <p className="eyebrow">Focus</p>
          <h2>Active Missions</h2>
        </div>
        <button className="text-button" onClick={() => setActiveTab('missions')}>Manage</button>
      </div>
      <div className="mission-list">
        {missions.slice(0, 3).map((mission) => (
          <article className="mission-card" key={mission.id}>
            <div>
              <h3>{mission.title}</h3>
              <p>{mission.why || 'No why added yet.'}</p>
            </div>
            <Pill tone={mission.status === 'On Track' ? 'green' : mission.status === 'Slipping' ? 'red' : 'default'}>{mission.status}</Pill>
          </article>
        ))}
      </div>

      <div className="two-column">
        <div className="card">
          <div className="mini-header">
            <ListChecks size={18} />
            <h3>Urgent Next Actions</h3>
          </div>
          {openTasks.length ? (
            <div className="compact-list">
              {openTasks.slice(0, 5).map((task) => (
                <button key={task.id} className="compact-item" onClick={() => updateThought(task.id, { status: task.status === 'Done' ? 'Open' : 'Done' })}>
                  <CheckCircle2 size={17} />
                  <span>{task.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="No actions yet" text="Capture or convert a thought into a next action." />
          )}
        </div>

        <div className="card">
          <div className="mini-header">
            <AlertCircle size={18} />
            <h3>Open Loops</h3>
          </div>
          {openLoops.length ? (
            <div className="compact-list">
              {openLoops.slice(0, 5).map((loop) => {
                const category = getCategory(loop.category);
                return (
                  <button
                    key={loop.id}
                    className="compact-item"
                    onClick={() => {
                      setSelectedCategory(loop.category);
                      setActiveTab('sort');
                    }}
                  >
                    <category.icon size={17} />
                    <span>{loop.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title="No open loops" text="Problems, decisions, and waiting items will show up here." />
          )}
        </div>
      </div>

      <div className="card noise-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Mental Noise Check</p>
            <h2>Repeated Worry Loop</h2>
          </div>
          <button className="secondary-button compact" onClick={() => setModal({ type: 'quick-capture' })}>
            <Plus size={16} />
            Add
          </button>
        </div>
        {noiseItems.length ? (
          <ThoughtCard thought={noiseItems[0]} updateThought={updateThought} compact />
        ) : (
          <p className="muted">No anxiety/noise entries yet. When a thought repeats but has no clear action, put it here.</p>
        )}
      </div>

      <div className="card close-day-card">
        <div className="close-day-copy">
          <p className="eyebrow">End of Day</p>
          <h2>Did I get better today?</h2>
          <p className="muted">Score the day, then hand it to your Journal to write your own review.</p>
        </div>
        <button className="primary-button compact" onClick={() => setModal({ type: 'close-the-day' })}>
          <MoonStar size={17} />
          Close the Day
        </button>
      </div>
    </section>
  );
}

function CaptureView({ addThought, missions, setActiveTab }) {
  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Phase 1</p>
          <h2>Brain Dump Inbox</h2>
          <p className="muted">Get the thought out of your head first. Perfect sorting can happen after.</p>
        </div>
      </div>
      <CaptureForm
        addThought={(input) => {
          addThought(input);
          setActiveTab('sort');
        }}
        missions={missions}
      />
    </section>
  );
}

function CaptureForm({ addThought, missions, compact = false }) {
  const [form, setForm] = useState({
    text: '',
    category: '',
    area: 'Personal',
    nextAction: '',
    notes: '',
    dueDate: '',
    energy: 'Medium',
    relatedMissionId: '',
  });

  const selected = form.category ? getCategory(form.category) : null;

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.text.trim()) return;
    addThought(form);
    setForm({ text: '', category: '', area: 'Personal', nextAction: '', notes: '', dueDate: '', energy: 'Medium', relatedMissionId: '' });
  }

  return (
    <form className="capture-form card" onSubmit={submit}>
      <Field label="What is on your mind?">
        <textarea
          className="big-input"
          placeholder="Dump the thought here. Example: I need to figure out money before this week gets away from me."
          value={form.text}
          onChange={(event) => set('text', event.target.value)}
          autoFocus={compact}
        />
      </Field>

      <div className="form-grid">
        <Field label="Category">
          <select value={form.category} onChange={(event) => set('category', event.target.value)}>
            <option value="">Unsorted Inbox</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Life Area">
          <select value={form.area} onChange={(event) => set('area', event.target.value)}>
            {lifeAreas.map((area) => <option key={area}>{area}</option>)}
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
        <input placeholder="Example: check account balance and list upcoming expenses" value={form.nextAction} onChange={(event) => set('nextAction', event.target.value)} />
      </Field>

      <div className="form-grid">
        <Field label="Due / Follow-up Date">
          <input type="date" value={form.dueDate} onChange={(event) => set('dueDate', event.target.value)} />
        </Field>
        <Field label="Energy">
          <select value={form.energy} onChange={(event) => set('energy', event.target.value)}>
            {energyLevels.map((level) => <option key={level}>{level}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Related Mission">
        <select value={form.relatedMissionId} onChange={(event) => set('relatedMissionId', event.target.value)}>
          <option value="">None</option>
          {missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
        </select>
      </Field>

      <Field label="Notes">
        <textarea placeholder="Extra context, why it matters, options, or anything you do not want to forget." value={form.notes} onChange={(event) => set('notes', event.target.value)} />
      </Field>

      <button className="primary-button" type="submit">
        <Save size={17} />
        Save to Command Center
      </button>
    </form>
  );
}

function SortView({ thoughts, unsorted, categories, selectedCategory, setSelectedCategory, query, setQuery, filteredThoughts, updateThought, deleteThought, convertThought, setModal }) {
  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Phase 1 + 2 + 3</p>
          <h2>Sort & Convert</h2>
          <p className="muted">Every thought gets assigned a role: act, solve, decide, wait, maintain, park, or let go.</p>
        </div>
        <Pill tone={unsorted.length ? 'red' : 'green'}>{unsorted.length} unsorted</Pill>
      </div>

      {unsorted.length > 0 && (
        <div className="card inbox-triage">
          <div className="mini-header">
            <Inbox size={18} />
            <h3>Inbox Triage</h3>
          </div>
          <p className="muted">Sort these first so they stop floating around your head.</p>
          <div className="thought-list">
            {unsorted.slice(0, 3).map((thought) => (
              <TriageCard key={thought.id} thought={thought} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />
            ))}
          </div>
        </div>
      )}

      <div className="category-strip">
        {categories.map((category) => {
          const Icon = category.icon;
          const count = thoughts.filter((thought) => thought.category === category.id).length;
          return (
            <button
              key={category.id}
              className={`category-chip ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <Icon size={17} />
              <span>{category.short}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </div>

      <div className="search-bar">
        <Search size={18} />
        <input placeholder="Search this category..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>

      <CategoryDetail category={getCategory(selectedCategory)} thoughts={filteredThoughts} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />
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
            <p>{category.description}</p>
          </div>
        </div>
      </div>

      {thoughts.length ? (
        <div className="thought-list">
          {thoughts.map((thought) => (
            <ThoughtCard
              key={thought.id}
              thought={thought}
              updateThought={updateThought}
              deleteThought={deleteThought}
              convertThought={convertThought}
              setModal={setModal}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing here yet" text="Captured items sorted into this category will show up here." />
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
  return (
    <article className={`thought-card ${compact ? 'compact-card' : ''}`}>
      <div className="thought-topline">
        <div className="thought-labels">
          <Pill tone={category.color}><Icon size={13} /> {category.short}</Pill>
          <Pill tone="default">{thought.area}</Pill>
          {thought.dueDate && <Pill tone="yellow"><CalendarDays size={13} /> {formatDate(thought.dueDate)}</Pill>}
        </div>
        <button className="icon-button" onClick={() => updateThought(thought.id, { pinned: !thought.pinned })} title="Pin item">
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

      {!compact && <ConversionButtons thought={thought} convertThought={convertThought} />}

      <div className="card-actions">
        <select value={thought.status} onChange={(event) => updateThought(thought.id, { status: event.target.value })}>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <button className="text-button" onClick={() => setModal({ type: 'edit-thought', thought })}><Edit3 size={15} /> Edit</button>
        {deleteThought && <button className="danger-button" onClick={() => deleteThought(thought.id)}><Trash2 size={15} /> Delete</button>}
      </div>
    </article>
  );
}

function ConversionButtons({ thought, convertThought }) {
  const buttons = [
    { id: 'task', label: 'Make Task', icon: CheckCircle2 },
    { id: 'problem', label: 'Make Problem', icon: HelpCircle },
    { id: 'decision', label: 'Make Decision', icon: Compass },
    { id: 'waiting', label: 'Waiting On', icon: TimerReset },
    { id: 'someday', label: 'Park It', icon: Archive },
    { id: 'noise', label: 'Noise', icon: Brain },
  ];
  return (
    <div className="convert-row">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <button key={button.id} onClick={() => convertThought(thought, button.id)}>
            <Icon size={14} />
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

function ThoughtEditForm({ thought, missions, updateThought }) {
  const [form, setForm] = useState({ ...thought });
  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function submit(event) {
    event.preventDefault();
    updateThought(thought.id, form);
  }
  return (
    <form className="capture-form" onSubmit={submit}>
      <Field label="Title / Thought">
        <textarea className="big-input" value={form.text} onChange={(event) => set('text', event.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Category">
          <select value={form.category || ''} onChange={(event) => set('category', event.target.value)}>
            <option value="">Unsorted</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </Field>
        <Field label="Area">
          <select value={form.area || 'Personal'} onChange={(event) => set('area', event.target.value)}>
            {lifeAreas.map((area) => <option key={area}>{area}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Next Action">
        <input value={form.nextAction || ''} onChange={(event) => set('nextAction', event.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Due / Follow-up">
          <input type="date" value={form.dueDate || ''} onChange={(event) => set('dueDate', event.target.value)} />
        </Field>
        <Field label="Status">
          <select value={form.status || 'Open'} onChange={(event) => set('status', event.target.value)}>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Related Mission">
        <select value={form.relatedMissionId || ''} onChange={(event) => set('relatedMissionId', event.target.value)}>
          <option value="">None</option>
          {missions.map((mission) => <option key={mission.id} value={mission.id}>{mission.title}</option>)}
        </select>
      </Field>
      {form.category === 'decisions' && (
        <Field label="Options">
          <textarea value={form.decisionOptions || ''} onChange={(event) => set('decisionOptions', event.target.value)} placeholder="Option A / Option B / Current leaning" />
        </Field>
      )}
      {form.category === 'waiting-on' && (
        <Field label="Waiting On">
          <input value={form.waitingOn || ''} onChange={(event) => set('waitingOn', event.target.value)} placeholder="Person, payment, email, answer, appointment..." />
        </Field>
      )}
      {form.category === 'anxiety-noise' && (
        <>
          <Field label="Grounded Truth">
            <textarea value={form.truth || ''} onChange={(event) => set('truth', event.target.value)} placeholder="What is actually true?" />
          </Field>
          <Field label="Exaggeration / Fear Loop">
            <textarea value={form.exaggeration || ''} onChange={(event) => set('exaggeration', event.target.value)} placeholder="What part is your brain exaggerating?" />
          </Field>
        </>
      )}
      <Field label="Notes">
        <textarea value={form.notes || ''} onChange={(event) => set('notes', event.target.value)} />
      </Field>
      <button className="primary-button" type="submit"><Save size={17} /> Save Changes</button>
    </form>
  );
}

function MissionsView({ missions, thoughts, addMission, updateMission, deleteMission, setActiveTab, setSelectedCategory }) {
  const [form, setForm] = useState({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work' });
  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function submit(event) {
    event.preventDefault();
    addMission(form);
    setForm({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work' });
  }

  return (
    <section className="screen stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Phase 1</p>
          <h2>Active Missions</h2>
          <p className="muted">Cap this at 3 when possible. More than that becomes mental clutter.</p>
        </div>
        <Pill tone={missions.length <= 3 ? 'green' : 'red'}>{missions.length}/3 active</Pill>
      </div>

      <div className="mission-list detailed">
        {missions.map((mission) => {
          const related = thoughts.filter((thought) => thought.relatedMissionId === mission.id && thought.status !== 'Done');
          return (
            <article className="mission-detail-card" key={mission.id}>
              <div className="mission-detail-top">
                <div>
                  <p className="eyebrow">{mission.area}</p>
                  <h3>{mission.title}</h3>
                </div>
                <select value={mission.status} onChange={(event) => updateMission(mission.id, { status: event.target.value })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <Field label="Why it matters">
                <textarea value={mission.why} onChange={(event) => updateMission(mission.id, { why: event.target.value })} />
              </Field>
              <Field label="This week’s goal">
                <input value={mission.weeklyGoal} onChange={(event) => updateMission(mission.id, { weeklyGoal: event.target.value })} />
              </Field>
              <Field label="Next action">
                <input value={mission.nextAction} onChange={(event) => updateMission(mission.id, { nextAction: event.target.value })} />
              </Field>
              <div className="mission-footer">
                <button className="secondary-button compact" onClick={() => {
                  setSelectedCategory('next-actions');
                  setActiveTab('sort');
                }}>
                  <ClipboardList size={16} /> {related.length} related items
                </button>
                <button className="danger-button" onClick={() => deleteMission(mission.id)}><Trash2 size={15} /> Delete</button>
              </div>
            </article>
          );
        })}
      </div>

      <form className="card capture-form" onSubmit={submit}>
        <div className="mini-header">
          <Plus size={18} />
          <h3>Add Mission</h3>
        </div>
        <Field label="Mission Name">
          <input placeholder="Example: Build real-world AI value" value={form.title} onChange={(event) => set('title', event.target.value)} />
        </Field>
        <Field label="Why it matters">
          <textarea value={form.why} onChange={(event) => set('why', event.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="Area">
            <select value={form.area} onChange={(event) => set('area', event.target.value)}>
              {lifeAreas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(event) => set('status', event.target.value)}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </Field>
        </div>
        <Field label="This week’s goal">
          <input value={form.weeklyGoal} onChange={(event) => set('weeklyGoal', event.target.value)} />
        </Field>
        <Field label="Next action">
          <input value={form.nextAction} onChange={(event) => set('nextAction', event.target.value)} />
        </Field>
        <button className="primary-button" type="submit"><Target size={17} /> Add Mission</button>
      </form>
    </section>
  );
}

function ReviewView({ state, saveReview }) {
  const [review, setReview] = useState({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  function set(key, value) {
    setReview((prev) => ({ ...prev, [key]: value }));
  }
  function submit(event) {
    event.preventDefault();
    saveReview(review);
    setReview({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  }
  const counts = categories.map((category) => ({ ...category, count: state.thoughts.filter((thought) => thought.category === category.id).length }));
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
              <Icon size={18} />
              <strong>{item.count}</strong>
              <span>{item.short}</span>
            </div>
          );
        })}
      </div>

      <form className="card capture-form" onSubmit={submit}>
        <div className="mini-header">
          <RefreshCw size={18} />
          <h3>Sunday Life Reset</h3>
        </div>
        <Field label="What improved this week?">
          <textarea value={review.improved} onChange={(event) => set('improved', event.target.value)} />
        </Field>
        <Field label="What did I avoid?">
          <textarea value={review.avoided} onChange={(event) => set('avoided', event.target.value)} />
        </Field>
        <Field label="What actually mattered?">
          <textarea value={review.mattered} onChange={(event) => set('mattered', event.target.value)} />
        </Field>
        <Field label="What kept stressing me out?">
          <textarea value={review.stress} onChange={(event) => set('stress', event.target.value)} />
        </Field>
        <Field label="Next week’s 3 priorities">
          <textarea value={review.nextWeek} onChange={(event) => set('nextWeek', event.target.value)} placeholder="1. ...\n2. ...\n3. ..." />
        </Field>
        <button className="primary-button" type="submit"><Save size={17} /> Save Weekly Review</button>
      </form>

      <div className="card">
        <div className="mini-header">
          <Clock3 size={18} />
          <h3>Past Reviews</h3>
        </div>
        {state.reviews.length ? (
          <div className="thought-list">
            {state.reviews.map((item) => (
              <article className="review-card" key={item.id}>
                <p className="eyebrow">{formatDate(item.createdAt)}</p>
                <h3>Next Week’s 3</h3>
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

const BETTER_QUESTIONS = [
  { key: 'mission', label: 'Did I move a mission forward?' },
  { key: 'body', label: 'Did I keep my body & discipline standards?' },
  { key: 'courage', label: 'Did I face the thing I was avoiding?' },
  { key: 'mind', label: 'Did I quiet the mental noise?' },
  { key: 'becoming', label: 'Did I live like the person I’m trying to become?' },
];

function CloseTheDay({ thoughts, missions, today, buildDaySummary, saveDayReview }) {
  const [phase, setPhase] = useState('verdict');
  const [verdict, setVerdict] = useState('');
  const [answers, setAnswers] = useState(() =>
    BETTER_QUESTIONS.reduce((acc, q) => ({ ...acc, [q.key]: null }), {})
  );
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(null);
  const [copied, setCopied] = useState(false);

  const score = BETTER_QUESTIONS.reduce((sum, q) => sum + (answers[q.key] ? 1 : 0), 0);
  const current = BETTER_QUESTIONS[step];
  const verdictTone = (v) => (v === 'Yes' ? 'green' : v === 'No' ? 'red' : 'yellow');

  function pickVerdict(v) {
    setVerdict(v);
    setPhase('questions');
  }

  function answer(hit) {
    const next = { ...answers, [current.key]: hit };
    setAnswers(next);
    if (step < BETTER_QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const finalScore = BETTER_QUESTIONS.reduce((sum, q) => sum + (next[q.key] ? 1 : 0), 0);
      const review = {
        verdict,
        score: finalScore,
        answers: BETTER_QUESTIONS.map((q) => ({ key: q.key, label: q.label, hit: !!next[q.key] })),
      };
      const stored = saveDayReview(review);
      setSaved(stored);
      setPhase('result');
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* noop */ }
    document.body.removeChild(ta);
    done();
  }

  function copySummary() {
    const text = buildDaySummary({ thoughts, missions, today, review: saved });
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 2200); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  if (phase === 'verdict') {
    return (
      <div className="ctd">
        <div className="ctd-head">
          <MoonStar size={22} />
          <div>
            <h3>Did I get better today?</h3>
            <p className="muted">Gut call first. The score comes next.</p>
          </div>
        </div>
        <div className="ctd-verdict">
          {['Yes', 'Neutral', 'No'].map((v) => (
            <button key={v} className={`ctd-verdict-btn tone-${verdictTone(v)}`} onClick={() => pickVerdict(v)}>
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'questions') {
    const runningScore = BETTER_QUESTIONS.slice(0, step).reduce((s, q) => s + (answers[q.key] ? 1 : 0), 0);
    return (
      <div className="ctd">
        <div className="ctd-progress">
          <span>Question {step + 1} of {BETTER_QUESTIONS.length}</span>
          <div className="ctd-bar"><div style={{ width: `${(step / BETTER_QUESTIONS.length) * 100}%` }} /></div>
        </div>
        <div className="ctd-question">
          <h3>{current.label}</h3>
        </div>
        <div className="ctd-yesno">
          <button className="ctd-yes" onClick={() => answer(true)}><Check size={18} /> Yes</button>
          <button className="ctd-no" onClick={() => answer(false)}><X size={18} /> Not today</button>
        </div>
        <p className="muted ctd-running">Running score: {runningScore} / {step}</p>
      </div>
    );
  }

  return (
    <div className="ctd">
      <div className="ctd-scorewrap">
        <div className={`ctd-score tone-${verdictTone(verdict)}`}>
          <strong>{score}</strong>
          <span>/ 5</span>
        </div>
        <div>
          <Pill tone={verdictTone(verdict)}>{verdict}</Pill>
          <p className="muted ctd-scorenote">
            {score >= 4 ? 'Strong day. Bank it.'
              : score === 3 ? 'Solid middle. You showed up.'
              : score >= 1 ? 'Partial — name one thing for tomorrow.'
              : 'Rough one. Closing it honestly still counts.'}
          </p>
        </div>
      </div>

      <div className="ctd-answers">
        {saved.answers.map((a) => (
          <div key={a.key} className={`ctd-answer ${a.hit ? 'hit' : 'miss'}`}>
            {a.hit ? <Check size={15} /> : <X size={15} />}
            <span>{a.label}</span>
          </div>
        ))}
      </div>

      <button className="primary-button" onClick={copySummary}>
        {copied ? <><ClipboardCheck size={17} /> Copied — paste into Journal</> : <><Copy size={17} /> Copy day for Journal</>}
      </button>
      <p className="muted ctd-hint">
        Copy this, open Apple Journal, paste, then write your own review under the line.
      </p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
