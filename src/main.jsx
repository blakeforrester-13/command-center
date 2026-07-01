import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Brain, CheckCircle2, ClipboardList, Compass, DollarSign,
  Home, Inbox, Layers, Plus, RefreshCw, Search, Sparkles,
  Target, TimerReset, Trash2, Users, X, AlertCircle,
  CalendarDays, Clock3, Flag, HelpCircle, ShieldCheck,
  Archive, ArrowRight, Save, Edit3, CircleDashed, Zap,
  Clock, BatteryLow, BatteryMedium, BatteryFull,
  ChevronDown, ChevronRight, ArrowUpCircle, TrendingUp, Trophy,
  MoonStar, RotateCcw, Copy, Check, Mountain, Flame, Lightbulb, PauseCircle,
  Briefcase, GraduationCap, Heart, User, Code, Telescope,
  Crosshair, Activity, Star,
} from 'lucide-react';
import './styles.css';

// ─── Supabase client ───────────────────────────────────────────────────────
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── Category tiers ────────────────────────────────────────────────────────
const categoryTiers = [
  { id: 'act-now', label: 'Act Now', description: 'Momentum — things with clear forward motion', color: 'tier-act', icon: Flame },
  { id: 'needs-thinking', label: 'Needs Thinking', description: 'Open loops — draining attention until closed', color: 'tier-think', icon: Lightbulb },
  { id: 'hold', label: 'Hold / Background', description: 'Stable or parked — not this week', color: 'tier-hold', icon: PauseCircle },
];

const categoryItemLabel = {
  'active-missions': 'Mission', 'next-actions': 'Action', 'problems': 'Problem',
  'decisions': 'Decision', 'waiting-on': 'Waiting On', 'maintenance': 'Maintenance Task',
  'relationships': 'Relationship Item', 'money-adult-life': 'Adult Life Item',
  'someday': 'Someday Idea', 'anxiety-noise': 'Noise / Worry',
};

const categories = [
  { id: 'active-missions', label: 'Active Missions', short: 'Missions', icon: Target, color: 'amber', tier: 'act-now', description: 'The major priorities you are actively focused on right now. Keep this capped at 3.', prompt: 'What bigger priority does this connect to?' },
  { id: 'next-actions', label: 'Next Actions', short: 'Actions', icon: CheckCircle2, color: 'green', tier: 'act-now', description: 'Small specific tasks you can actually do right now.', prompt: 'What is the next physical action?' },
  { id: 'problems', label: 'Problems to Solve', short: 'Problems', icon: HelpCircle, color: 'orange', tier: 'needs-thinking', description: 'Things that need thinking, planning, or breaking down before action.', prompt: 'What question needs to be solved?' },
  { id: 'decisions', label: 'Decisions', short: 'Decisions', icon: Compass, color: 'purple', tier: 'needs-thinking', description: 'Open choices that are draining attention until you close them.', prompt: 'What options are you choosing between?' },
  { id: 'waiting-on', label: 'Waiting On', short: 'Waiting', icon: TimerReset, color: 'yellow', tier: 'needs-thinking', description: 'Things blocked by another person, answer, event, payment, or deadline.', prompt: 'Who or what are you waiting on?' },
  { id: 'maintenance', label: 'Maintenance', short: 'Maintenance', icon: ShieldCheck, color: 'teal', tier: 'hold', description: 'The basic things that keep life stable: cleaning, hygiene, sleep, food, school basics.', prompt: 'What keeps this from becoming chaos?' },
  { id: 'relationships', label: 'Relationships', short: 'People', icon: Users, color: 'pink', tier: 'hold', description: 'Gabi, family, siblings, friends, work relationships, networking, and conversations.', prompt: 'Who does this involve and what would showing up well look like?' },
  { id: 'money-adult-life', label: 'Money / Adult Life', short: 'Adult Life', icon: DollarSign, color: 'blue', tier: 'hold', description: 'Money, forms, subscriptions, appointments, documents, car, school admin, and responsibilities.', prompt: 'What real-world responsibility needs clarity?' },
  { id: 'someday', label: 'Someday / Parking Lot', short: 'Someday', icon: Archive, color: 'slate', tier: 'hold', description: 'Good ideas that matter, but not right now.', prompt: 'Why is this not for this week?' },
  { id: 'anxiety-noise', label: 'Anxiety / Noise', short: 'Noise', icon: Brain, color: 'red', tier: 'hold', description: 'Fear loops, repeated worries, vague pressure, and thoughts with no clear action yet.', prompt: 'Is there a real action here, or is this a repeated worry loop?' },
];

const lifeAreaMeta = {
  'Work':         { color: 'amber',   icon: Briefcase },
  'School':       { color: 'purple',  icon: GraduationCap },
  'Money':        { color: 'blue',    icon: DollarSign },
  'Health':       { color: 'rose',    icon: Heart },
  'Relationships':{ color: 'pink',    icon: Users },
  'Family':       { color: 'orange',  icon: Mountain },
  'Personal':     { color: 'teal',    icon: User },
  'App/Projects': { color: 'yellow',  icon: Code },
  'Future':       { color: 'slate',   icon: Telescope },
};
function getAreaMeta(area) {
  return lifeAreaMeta[area] || { color: 'slate', icon: CircleDashed };
}

const lifeAreas = ['Work', 'School', 'Money', 'Health', 'Relationships', 'Family', 'Personal', 'App/Projects', 'Future'];
const energyLevels = ['Low', 'Medium', 'High'];
const statuses = ['Open', 'On Track', 'Slipping', 'Blocked', 'Done'];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getDaysOld(isoString) {
  if (!isoString) return 0;
  return Math.floor((Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60 * 24));
}
function stalenessLabel(days, category) {
  if (category === 'waiting-on' && days >= 14) return { label: `${days}d — follow up?`, urgent: true };
  if (category === 'decisions' && days >= 7) return { label: `${days}d open`, urgent: true };
  if (category === 'problems' && days >= 10) return { label: `${days}d — needs attention`, urgent: days >= 14 };
  if (days >= 21) return { label: `${days}d — stale`, urgent: false };
  return null;
}
function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatDateFull(value) {
  if (!value) return '';
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  // Parse the YYYY-MM-DD parts directly — never let JS shift the date
  const str = value.length > 10 ? value : value;
  const year = parseInt(str.slice(0, 4), 10);
  const month = parseInt(str.slice(5, 7), 10) - 1;
  const day = parseInt(str.slice(8, 10), 10);
  // Build a local date from parts to get the correct weekday
  const d = new Date(year, month, day);
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function getDayKey(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 10);
}
function getLocalTodayKey() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 10);
}
function getCategory(id) { return categories.find((c) => c.id === id) || categories[0]; }

// ─── DB helpers — convert snake_case DB rows ↔ camelCase app objects ───────
function dbToThought(row) {
  return {
    id: row.id, text: row.text, category: row.category || '',
    area: row.area || 'Personal', status: row.status || 'Open',
    createdAt: row.created_at, completedAt: row.completed_at || '',
    nextAction: row.next_action || '', notes: row.notes || '',
    dueDate: row.due_date || '', energy: row.energy || 'Medium',
    pinned: row.pinned || false, relatedMissionId: row.related_mission_id || '',
    decisionOptions: row.decision_options || '', waitingOn: row.waiting_on || '',
    truth: row.truth || '', exaggeration: row.exaggeration || '',
  };
}
function thoughtToDb(t) {
  return {
    id: t.id, text: t.text, category: t.category || '',
    area: t.area || 'Personal', status: t.status || 'Open',
    created_at: t.createdAt, completed_at: t.completedAt || null,
    next_action: t.nextAction || '', notes: t.notes || '',
    due_date: t.dueDate || '', energy: t.energy || 'Medium',
    pinned: t.pinned || false, related_mission_id: t.relatedMissionId || '',
    decision_options: t.decisionOptions || '', waiting_on: t.waitingOn || '',
    truth: t.truth || '', exaggeration: t.exaggeration || '',
  };
}
function dbToMission(row) {
  return {
    id: row.id, title: row.title, why: row.why || '',
    weeklyGoal: row.weekly_goal || '', nextAction: row.next_action || '',
    status: row.status || 'Open', area: row.area || 'Personal',
    createdAt: row.created_at, targetDate: row.target_date || '',
  };
}
function missionToDb(m) {
  return {
    id: m.id, title: m.title, why: m.why || '',
    weekly_goal: m.weeklyGoal || '', next_action: m.nextAction || '',
    status: m.status || 'Open', area: m.area || 'Personal',
    created_at: m.createdAt, target_date: m.targetDate || null,
  };
}
function dbToToday(row) {
  return {
    mainMissionId: row.main_mission_id || '',
    mainMissionText: row.main_mission_text || 'Pick one thing that moves life forward today.',
    bodyWin: row.body_win || 'Do one action that keeps your body/life stable.',
    lifeWinId: row.life_win_id || '',
    lifeWinText: row.life_win_text || 'Clear one small real-life open loop.',
    avoiding: row.avoiding || 'Name the thing you do not want to deal with.',
    updatedAt: row.updated_at,
  };
}
function dbToReview(row) {
  return {
    id: row.id, improved: row.improved || '', avoided: row.avoided || '',
    mattered: row.mattered || '', stress: row.stress || '',
    nextWeek: row.next_week || '', createdAt: row.created_at,
  };
}

// ─── UI Primitives ─────────────────────────────────────────────────────────
function Pill({ children, tone = 'default', className = '' }) {
  return <span className={`pill pill-${tone} ${className}`}>{children}</span>;
}
function IconBadge({ icon: Icon, tone = 'amber' }) {
  return <div className={`icon-badge icon-${tone}`}><Icon size={18} /></div>;
}
function EmptyState({ icon: Icon = CircleDashed, title, text }) {
  return <div className="empty-state"><Icon size={28} /><h3>{title}</h3><p>{text}</p></div>;
}
function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function EnergyIcon({ level }) {
  if (level === 'Low') return <BatteryLow size={14} />;
  if (level === 'High') return <BatteryFull size={14} />;
  return <BatteryMedium size={14} />;
}
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <Sparkles size={32} className="loading-icon" />
      <p>Loading your Command Center...</p>
    </div>
  );
}

// ─── Daily Quote ───────────────────────────────────────────────────────────
const QUOTES = [
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The purpose of life is not to be happy. It is to be useful, to be honorable, to be compassionate, to have it make some difference that you have lived.", author: "Ralph Waldo Emerson" },
  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "It is not the mountain we conquer, but ourselves.", author: "Edmund Hillary" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Don't wish it were easier. Wish you were better.", author: "Jim Rohn" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The quality of your life is the quality of your relationships.", author: "Tony Robbins" },
  { text: "One day or day one. You decide.", author: "Paulo Coelho" },
  { text: "Be who you needed when you were younger.", author: "AI-generated" },
  { text: "Comfort is the enemy of growth. Show up anyway.", author: "AI-generated" },
  { text: "The version of you that future-you is proud of started on a regular Tuesday.", author: "AI-generated" },
  { text: "Your only competition is who you were yesterday.", author: "AI-generated" },
];
function getDailyQuote() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return QUOTES[seed % QUOTES.length];
}
function DailyQuote() {
  const quote = getDailyQuote();
  return (
    <div className="daily-quote-card">
      <p className="daily-quote-text">"{quote.text}"</p>
      <p className="daily-quote-author">— {quote.author}</p>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  const [thoughts, setThoughts] = useState([]);
  const [missions, setMissions] = useState([]);
  const [today, setToday] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [progressSubTab, setProgressSubTab] = useState('accomplishments');
  const [selectedCategory, setSelectedCategory] = useState('active-missions');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [energyFilter, setEnergyFilter] = useState('');
  const [highlightGoalId, setHighlightGoalId] = useState('');
  const [pinnedGoalIds, setPinnedGoalIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('blakeos-pinned-goals') || '[]'); } catch { return []; }
  });

  function savePinnedGoals(ids) {
    setPinnedGoalIds(ids);
    localStorage.setItem('blakeos-pinned-goals', JSON.stringify(ids));
  }

  // ── Load all data from Supabase on mount ──
  useEffect(() => {
    async function loadAll() {
      const [thoughtsRes, missionsRes, todayRes, reviewsRes] = await Promise.all([
        supabase.from('thoughts').select('*').order('created_at', { ascending: false }),
        supabase.from('missions').select('*').order('created_at', { ascending: false }),
        supabase.from('today_focus').select('*').eq('id', 1).single(),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ]);
      if (thoughtsRes.data) setThoughts(thoughtsRes.data.map(dbToThought));
      if (missionsRes.data) setMissions(missionsRes.data.map(dbToMission));
      if (todayRes.data) setToday(dbToToday(todayRes.data));
      else setToday({ mainMissionId: '', mainMissionText: 'Pick one thing that moves life forward today.', bodyWin: 'Do one action that keeps your body/life stable.', lifeWinId: '', lifeWinText: 'Clear one small real-life open loop.', avoiding: 'Name the thing you do not want to deal with.', updatedAt: new Date().toISOString() });
      if (reviewsRes.data) setReviews(reviewsRes.data.map(dbToReview));
      setLoading(false);
    }
    loadAll();
  }, []);

  // ── Derived lists ──
  const activeThoughts = thoughts.filter((t) => t.status !== 'Done');
  const doneThoughts = thoughts.filter((t) => t.status === 'Done');
  const unsorted = activeThoughts.filter((t) => !t.category);
  const openTasks = activeThoughts.filter((t) => t.category === 'next-actions');
  const openLoops = activeThoughts.filter((t) => ['problems', 'decisions', 'waiting-on'].includes(t.category));
  const noiseItems = activeThoughts.filter((t) => t.category === 'anxiety-noise');
  const activeMissionItems = activeThoughts.filter((t) => t.category === 'active-missions');

  const pinnedMissions = useMemo(() => {
    if (pinnedGoalIds.length > 0) {
      const pinned = pinnedGoalIds.map((id) => missions.find((m) => m.id === id)).filter(Boolean);
      if (pinned.length > 0) return pinned.slice(0, 3);
    }
    return missions.slice(0, 3);
  }, [missions, pinnedGoalIds]);

  const filteredThoughts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return activeThoughts
      .filter((t) => selectedCategory ? t.category === selectedCategory : true)
      .filter((t) => {
        if (!normalized) return true;
        return [t.text, t.area, t.notes, t.nextAction, t.status].join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeThoughts, selectedCategory, query]);

  const energyFilteredTasks = useMemo(() => {
    return openTasks.filter((t) => !energyFilter || t.energy === energyFilter);
  }, [openTasks, energyFilter]);

  // ── Today ──
  async function updateToday(key, value) {
    const updated = { ...today, [key]: value, updatedAt: new Date().toISOString() };
    setToday(updated);
    await supabase.from('today_focus').upsert({
      id: 1,
      main_mission_id: updated.mainMissionId,
      main_mission_text: updated.mainMissionText,
      body_win: updated.bodyWin,
      life_win_id: updated.lifeWinId,
      life_win_text: updated.lifeWinText,
      avoiding: updated.avoiding,
      updated_at: updated.updatedAt,
    });
  }

  // ── Thoughts ──
  async function addThought(input) {
    const thought = {
      id: crypto.randomUUID(),
      text: input.text.trim(), category: input.category || '',
      area: input.area || 'Personal', status: input.status || 'Open',
      createdAt: new Date().toISOString(), completedAt: '',
      nextAction: input.nextAction || '', notes: input.notes || '',
      dueDate: input.dueDate || '', energy: input.energy || 'Medium',
      pinned: false, relatedMissionId: input.relatedMissionId || '',
      decisionOptions: '', waitingOn: '', truth: '', exaggeration: '',
    };
    if (!thought.text) return;
    setThoughts((prev) => [thought, ...prev]);
    await supabase.from('thoughts').insert(thoughtToDb(thought));
  }

  async function updateThought(id, patch) {
    const extra = patch.status === 'Done' ? { completedAt: new Date().toISOString() } : {};
    setThoughts((prev) => prev.map((t) => t.id === id ? { ...t, ...patch, ...extra } : t));
    const updated = thoughts.find((t) => t.id === id);
    if (!updated) return;
    const merged = { ...updated, ...patch, ...extra };
    await supabase.from('thoughts').update(thoughtToDb(merged)).eq('id', id);
  }

  async function deleteThought(id) {
    setThoughts((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('thoughts').delete().eq('id', id);
  }

  // ── Missions ──
  async function addMission(input) {
    const mission = {
      id: crypto.randomUUID(), title: input.title.trim(),
      why: input.why || '', weeklyGoal: input.weeklyGoal || '',
      nextAction: input.nextAction || '', status: input.status || 'Open',
      area: input.area || 'Personal', createdAt: new Date().toISOString(),
      targetDate: input.targetDate || '',
    };
    if (!mission.title) return;
    setMissions((prev) => [mission, ...prev]);
    await supabase.from('missions').insert(missionToDb(mission));
  }

  async function updateMission(id, patch) {
    setMissions((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
    const updated = missions.find((m) => m.id === id);
    if (!updated) return;
    const merged = { ...updated, ...patch };
    await supabase.from('missions').update(missionToDb(merged)).eq('id', id);
  }

  async function deleteMission(id) {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    await supabase.from('missions').delete().eq('id', id);
  }

  // ── Reviews ──
  async function saveReview(review) {
    const saved = { ...review, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setReviews((prev) => [saved, ...prev]);
    await supabase.from('reviews').insert({
      id: saved.id, improved: saved.improved, avoided: saved.avoided,
      mattered: saved.mattered, stress: saved.stress,
      next_week: saved.nextWeek, created_at: saved.createdAt,
    });
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

  function promoteToToday(slot, id, text) {
    const keyMap = { main: 'mainMissionText', body: 'bodyWin', life: 'lifeWinText', avoiding: 'avoiding' };
    const idKeyMap = { main: 'mainMissionId', life: 'lifeWinId' };
    const valueKey = keyMap[slot];
    if (!valueKey) return;

    if (idKeyMap[slot]) updateToday(idKeyMap[slot], id);
    updateToday(valueKey, text.trim());
  }

  function completeSlot(slot, linkedId) {
    const keyMap = { main: 'mainMissionText', body: 'bodyWin', life: 'lifeWinText', avoiding: 'avoiding' };
    const idKeyMap = { main: 'mainMissionId', life: 'lifeWinId' };
    const valueKey = keyMap[slot];
    if (!valueKey) return;

    if (linkedId) updateThought(linkedId, { status: 'Done' });
    if (idKeyMap[slot]) updateToday(idKeyMap[slot], '');
    updateToday(valueKey, '');
  }

  function goToCategory(catId) {
    setSelectedCategory(catId);
    setActiveTab('sort');
  }

  const navItems = [
    { id: 'today',    label: 'Today',    icon: Home,       color: 'nav-amber'  },
    { id: 'capture',  label: 'Capture',  icon: Plus,       color: 'nav-gray'   },
    { id: 'sort',     label: 'Command',  icon: Layers,     color: 'nav-purple' },
    { id: 'goals',    label: 'Goals',    icon: Mountain,   color: 'nav-blue'   },
    { id: 'progress', label: 'Progress', icon: TrendingUp, color: 'nav-green'  },
  ];

  if (loading) return <LoadingScreen />;

  const slotsSet = today ? [today.mainMissionText, today.bodyWin, today.lifeWinText, today.avoiding].filter((v) => v && v.trim() && v.trim().length > 20).length : 0;
  const commandScore = Math.max(5, Math.min(100,
    Math.round((slotsSet * 14) + (missions.length ? 12 : 0) + Math.min(openTasks.length, 3) * 4 + 20 - Math.min(openLoops.length * 5, 20) - Math.min(noiseItems.length * 5, 10))
  ));
  const commandState = commandScore >= 80 ? 'Locked In' : commandScore >= 60 ? 'In Command' : commandScore >= 40 ? 'Building Command' : 'Scattered';

  return (
    <div className="app-shell">
      <header className="topbar topbar-with-strip">
        <div className="topbar-title-row">
          <div><p className="eyebrow">BlakeOS</p><h1>Command Center</h1></div>
          <button className="primary-button compact" onClick={() => setModal({ type: 'quick-capture' })}>
            <Plus size={17} /><span>Capture</span>
          </button>
        </div>
        <DailyCommandStrip
          state={commandState}
          missions={missions.length}
          actions={openTasks.length}
          loops={openLoops.length}
          noise={noiseItems.length}
          setActiveTab={setActiveTab}
          setSelectedCategory={setSelectedCategory}
        />
      </header>

      <main className="main-content">
        {activeTab === 'today' && today && (
          <TodayView
            today={today} updateToday={updateToday} missions={pinnedMissions} allMissions={missions}
            openTasks={openTasks} openLoops={openLoops} noiseItems={noiseItems}
            activeThoughts={activeThoughts} doneThoughts={doneThoughts}
            energyFilter={energyFilter} setEnergyFilter={setEnergyFilter}
            energyFilteredTasks={energyFilteredTasks}
            setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
            setModal={setModal} updateThought={updateThought}
            promoteToToday={promoteToToday}
            completeSlot={completeSlot}
            goToGoal={(id) => { setHighlightGoalId(id); setActiveTab('goals'); }}
            onManageGoals={() => setModal({ type: 'manage-goals' })}
          />
        )}
        {activeTab === 'capture' && <CaptureView addThought={addThought} missions={missions} setActiveTab={setActiveTab} />}
        {activeTab === 'sort' && (
          <SortView
            thoughts={activeThoughts} unsorted={unsorted}
            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
            query={query} setQuery={setQuery} filteredThoughts={filteredThoughts}
            updateThought={updateThought} deleteThought={deleteThought}
            convertThought={convertThought} setModal={setModal}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsView
            missions={missions} thoughts={activeThoughts}
            addMission={addMission} updateMission={updateMission}
            deleteMission={deleteMission}
            setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
            highlightGoalId={highlightGoalId} setHighlightGoalId={setHighlightGoalId}
          />
        )}
        {activeTab === 'progress' && (
          <ProgressView
            doneThoughts={doneThoughts} activeThoughts={activeThoughts}
            reviews={reviews} saveReview={saveReview}
            subTab={progressSubTab} setSubTab={setProgressSubTab}
            goToCategory={goToCategory}
            updateThought={updateThought} setModal={setModal}
          />
        )}
      </main>

      <nav className="bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button key={item.id} className={isActive ? `active ${item.color}` : ''} onClick={() => setActiveTab(item.id)}>
              <Icon size={19} /><span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {modal?.type === 'quick-capture' && (
        <Modal title="Quick Capture" onClose={() => setModal(null)}>
          <CaptureForm addThought={(input) => { addThought(input); setModal(null); setActiveTab('sort'); }} missions={missions} compact />
        </Modal>
      )}
      {modal?.type === 'edit-thought' && (
        <Modal title="Edit Item" onClose={() => setModal(null)}>
          <ThoughtEditForm thought={modal.thought} missions={missions} updateThought={(id, patch) => { updateThought(id, patch); setModal(null); }} />
        </Modal>
      )}
      {modal?.type === 'promote' && (
        <Modal title={`Pull into: ${modal.modeLabel || 'Command Card'}`} onClose={() => setModal(null)}>
          <PromoteModal
            mode={modal.slot}
            thoughts={activeThoughts}
            activeMissions={activeMissionItems}
            tasks={openTasks}
            loops={openLoops}
            onSelect={(id, text) => { promoteToToday(modal.slot, id, text); setModal(null); }}
          />
        </Modal>
      )}
      {modal?.type === 'close-day' && (
        <Modal title="Close the Day" onClose={() => setModal(null)}>
          <CloseDayModal
            thoughts={thoughts}
            missions={missions}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
      {modal?.type === 'manage-goals' && (
        <Modal title="Pin Goals to Today" onClose={() => setModal(null)}>
          <ManageGoalsModal
            missions={missions}
            pinnedGoalIds={pinnedGoalIds}
            onSave={(ids) => { savePinnedGoals(ids); setModal(null); }}
            onClose={() => setModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Today View ────────────────────────────────────────────────────────────
function TodayView({ today, updateToday, missions, allMissions, openTasks, openLoops, noiseItems, activeThoughts, doneThoughts, energyFilter, setEnergyFilter, energyFilteredTasks, setActiveTab, setSelectedCategory, setModal, updateThought, promoteToToday, completeSlot, goToGoal, onManageGoals }) {
  const defaultSlots = {
    mainMissionText: 'Choose 1-2 things that need single-pointed attention.',
    bodyWin: 'Choose 1-2 things that protect energy, body, or stability.',
    lifeWinText: 'Choose 1-2 things that create growth or long-term progress.',
    avoiding: 'Choose 1-2 things that need to get shipped or closed.',
  };
  const isMeaningful = (value, fallback) => Boolean(value && value.trim() && value.trim() !== fallback);
  const slotConfigs = [
    {
      id: 'main', number: '01', label: 'Focus', subtitle: 'Deep work, decisions, and mental clarity',
      tone: 'red', icon: Crosshair, value: today.mainMissionText,
      fallback: defaultSlots.mainMissionText, linkedId: today.mainMissionId,
      onChange: (v) => updateToday('mainMissionText', v),
      onPromote: () => setModal({ type: 'promote', slot: 'main', modeLabel: 'Focus' }),
      onComplete: () => completeSlot('main', today.mainMissionId),
    },
    {
      id: 'body', number: '02', label: 'Energy', subtitle: 'Body, recovery, stability, and fuel',
      tone: 'orange', icon: Activity, value: today.bodyWin,
      fallback: defaultSlots.bodyWin, linkedId: '',
      onChange: (v) => updateToday('bodyWin', v),
      onPromote: () => setModal({ type: 'promote', slot: 'body', modeLabel: 'Energy' }),
      onComplete: () => completeSlot('body', ''),
    },
    {
      id: 'life', number: '03', label: 'Growth', subtitle: 'Learning, reflection, and future progress',
      tone: 'amber', icon: Layers, value: today.lifeWinText,
      fallback: defaultSlots.lifeWinText, linkedId: today.lifeWinId,
      onChange: (v) => updateToday('lifeWinText', v),
      onPromote: () => setModal({ type: 'promote', slot: 'life', modeLabel: 'Growth' }),
      onComplete: () => completeSlot('life', today.lifeWinId),
    },
    {
      id: 'avoiding', number: '04', label: 'Execution', subtitle: 'Ship, close, respond, and move forward',
      tone: 'blue', icon: Zap, value: today.avoiding,
      fallback: defaultSlots.avoiding, linkedId: '',
      onChange: (v) => updateToday('avoiding', v),
      onPromote: () => setModal({ type: 'promote', slot: 'avoiding', modeLabel: 'Execution' }),
      onComplete: () => completeSlot('avoiding', ''),
    },
  ];

  const slotsSet = slotConfigs.filter((slot) => isMeaningful(slot.value, slot.fallback)).length;
  const clearedToday = (doneThoughts || []).filter((t) => getDayKey(t.completedAt || t.createdAt) === getLocalTodayKey()).length;
  const commandScore = Math.max(5, Math.min(100,
    Math.round((slotsSet * 14) + (missions.length ? 12 : 0) + Math.min(openTasks.length, 3) * 4 + 20 - Math.min(openLoops.length * 5, 20) - Math.min(noiseItems.length * 5, 10))
  ));
  const commandState = commandScore >= 80 ? 'Locked In' : commandScore >= 60 ? 'In Command' : commandScore >= 40 ? 'Building Command' : 'Scattered';

  return (
    <section className="screen stack">
      <div className="hero-card hero-command-layout">
        <div className="hero-copy">
          <p className="eyebrow">Daily Operating System</p>
          <h2>What deserves your attention?</h2>
          <p>Pick the few things that make today a win. Park everything else.</p>
        </div>
        <CommandRing
          score={commandScore}
          state={commandState}
          slotsSet={slotsSet}
          openTasks={openTasks.length}
          openLoops={openLoops.length}
          noiseCount={noiseItems.length}
          clearedToday={clearedToday}
        />
      </div>

      <DailyQuote />

      <div className="card todays-command-card">
        <div className="section-header">
          <div><p className="eyebrow">Behavioral Modes</p><h2>Today's Command Cards</h2><p className="muted">Focus, Energy, Growth, and Execution — 1-2 priorities each.</p></div>
          <Pill tone="slate">Updated {formatDate(today.updatedAt)}</Pill>
        </div>
        <div className="today-command-grid">
          {slotConfigs.map((slot) => (
            <TodaySlot
              key={slot.id}
              number={slot.number}
              label={slot.label}
              subtitle={slot.subtitle}
              value={slot.value}
              fallback={slot.fallback}
              tone={slot.tone}
              icon={slot.icon}
              onChange={slot.onChange}
              onPromote={slot.onPromote}
              onComplete={slot.onComplete}
              linkedId={slot.linkedId}
              isSet={isMeaningful(slot.value, slot.fallback)}
            />
          ))}
        </div>
      </div>
      <div className="section-header">
        <div><p className="eyebrow">Active Goals</p><h2>Where Momentum Lives</h2></div>
        <button className="promote-btn" onClick={onManageGoals}><Layers size={13} /> Choose Goals</button>
      </div>
      <div className="mission-list">
        {missions.slice(0, 3).map((m) => {
          const areaMeta = getAreaMeta(m.area);
          const AreaIcon = areaMeta.icon;
          return (
            <button
              key={m.id}
              className={`mission-card mission-card-btn mission-card-area-${m.area.toLowerCase().replace(/[^a-z]/g, '')}`}
              onClick={() => goToGoal(m.id)}
            >
              <div>
                <div className="mission-area-tag" style={{ color: `var(--cat-${areaMeta.color})` }}>
                  <AreaIcon size={13} /><span>{m.area}</span>
                </div>
                <h3>{m.title}</h3>
                <p>{m.why || 'No why added yet.'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Pill tone={m.status === 'On Track' ? 'green' : m.status === 'Slipping' || m.status === 'Blocked' ? 'red' : 'default'}>{m.status}</Pill>
                <ChevronRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </div>
            </button>
          );
        })}
        {missions.length === 0 && <EmptyState title="No goals yet" text="Go to Goals to set your top priorities." />}
      </div>
      <div className="card">
        <div className="section-header">
          <div><p className="eyebrow">Do Right Now</p><h2>Next Actions</h2></div>
          <div className="energy-toggle">
            {['', 'Low', 'Medium', 'High'].map((level) => (
              <button key={level} data-level={level} className={`energy-btn ${energyFilter === level ? 'active' : ''}`} onClick={() => setEnergyFilter(level)}>
                {level === '' ? 'All' : <><EnergyIcon level={level} /> {level}</>}
              </button>
            ))}
          </div>
        </div>
        {energyFilteredTasks.length ? (
          <div className="compact-list">
            {energyFilteredTasks.slice(0, 6).map((task) => {
              const cat = getCategory(task.category);
              const CatIcon = cat.icon;
              return (
                <div key={task.id} className="compact-item task-action-row">
                  <button className="task-text-btn" onClick={() => { setSelectedCategory('next-actions'); setActiveTab('sort'); }}>
                    <CatIcon size={16} className={`task-cat-icon-${cat.color}`} />
                    <div className="compact-item-body">
                      <span>{task.text}</span>
                      <div className="compact-meta">
                        <EnergyIcon level={task.energy} /><span className="meta-text">{task.energy}</span>
                        {task.dueDate && <><CalendarDays size={11} /><span className="meta-text">{formatDate(task.dueDate)}</span></>}
                      </div>
                    </div>
                  </button>
                  <button className="task-done-btn" onClick={() => updateThought(task.id, { status: 'Done' })} title="Mark done">
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              );
            })}
            {openTasks.length > 6 && (
              <button className="text-button full-width" onClick={() => { setSelectedCategory('next-actions'); setActiveTab('sort'); }}>See all {openTasks.length} actions →</button>
            )}
          </div>
        ) : (
          <EmptyState title={energyFilter ? `No ${energyFilter.toLowerCase()} energy tasks` : 'No open actions'} text="Capture or convert a thought into a next action." />
        )}
      </div>
      <div className="card">
        <div className="mini-header"><AlertCircle size={18} /><h3>Open Loops</h3><Pill tone={openLoops.length > 0 ? 'orange' : 'green'} className="ml-auto">{openLoops.length}</Pill></div>
        {openLoops.length ? (
          <div className="compact-list">
            {openLoops.slice(0, 5).map((loop) => {
              const cat = getCategory(loop.category);
              const stale = stalenessLabel(getDaysOld(loop.createdAt), loop.category);
              return (
                <button key={loop.id} className="compact-item" onClick={() => { setSelectedCategory(loop.category); setActiveTab('sort'); }}>
                  <cat.icon size={17} className={`task-cat-icon-${cat.color}`} />
                  <div className="compact-item-body">
                    <span>{loop.text}</span>
                    {stale && <span className={`stale-tag ${stale.urgent ? 'stale-urgent' : ''}`}><Clock size={11} /> {stale.label}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ) : <p className="muted small">No open loops. Problems, decisions, and waiting items show here.</p>}
      </div>
      <div className="card noise-card">
        <div className="section-header">
          <div><p className="eyebrow">Mental Noise</p><h2>Worry Check</h2></div>
          <button className="secondary-button compact" onClick={() => setModal({ type: 'quick-capture' })}><Plus size={16} /> Add</button>
        </div>
        {noiseItems.length ? (
          <ThoughtCard thought={noiseItems[0]} updateThought={updateThought} compact />
        ) : <p className="muted small">No noise entries yet. When a thought repeats with no clear action, put it here.</p>}
      </div>
      <button className="close-day-btn" onClick={() => setModal({ type: 'close-day' })}>
        <MoonStar size={20} />
        <span>Close the Day</span>
      </button>
    </section>
  );
}

function CommandRing({ score, state, slotsSet, openTasks, openLoops, noiseCount, clearedToday }) {
  const stateConfig = {
    'Locked In':        { color: '#60a5fa', glow: 'rgba(96,165,250,0.25)',  icon: '🔒', tagline: 'Elite discipline. Momentum is yours.' },
    'In Command':       { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', icon: '✦',  tagline: "You're executing. Keep the focus sharp." },
    'Building Command': { color: '#fbbf24', glow: 'rgba(251,191,36,0.2)',  icon: '↗',  tagline: 'Building momentum. Stay consistent.' },
    'Scattered':        { color: '#f87171', glow: 'rgba(248,113,113,0.2)', icon: '!',  tagline: 'Reset now. One action changes everything.' },
  };
  const cfg = stateConfig[state] || stateConfig['In Command'];
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - score / 100);

  const metrics = [
    { label: 'cards set', value: `${slotsSet}/4` },
    { label: 'action',    value: openTasks },
    { label: 'cleared',   value: clearedToday },
    { label: 'contained', value: noiseCount },
  ];

  return (
    <div className="command-ring-panel">
      <div className="command-ring-svg-wrap">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
          <circle
            cx="55" cy="55" r="42" fill="none"
            stroke={cfg.color} strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: '55px 55px', filter: `drop-shadow(0 0 8px ${cfg.color})` }}
          />
        </svg>
        <div className="command-ring-center">
          <strong>{score}%</strong>
          <span>COMMAND<br />STATE</span>
        </div>
      </div>
      <div className="command-ring-copy">
        <div className="command-state-header">
          <span className="command-state-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
          <span className="command-state-label" style={{ color: cfg.color }}>{state}</span>
        </div>
        <p className="command-state-tagline">{cfg.tagline}</p>
        <div className="command-ring-metrics">
          {metrics.map((m) => (
            <div key={m.label} className="command-metric-tile">
              <strong>{m.value}</strong>
              <span>{m.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailyCommandStrip({ state, missions, actions, loops, noise, setActiveTab, setSelectedCategory }) {
  const dayLabel = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const load = loops >= 4 || actions >= 8 ? 'Heavy' : loops >= 2 || actions >= 4 ? 'Medium' : 'Light';
  const loadColor = load === 'Heavy' ? 'strip-red' : load === 'Medium' ? 'strip-amber' : 'strip-green';

  function goTo(tab, cat) {
    if (setActiveTab) setActiveTab(tab);
    if (cat && setSelectedCategory) setSelectedCategory(cat);
  }

  return (
    <div className="daily-command-strip">
      <div className="command-strip-item command-strip-state"><Sparkles size={15} /><span>{state}</span></div>
      <div className="command-strip-item command-strip-date"><CalendarDays size={15} /><span>{dayLabel}</span></div>
      <button className="command-strip-item command-strip-btn strip-blue" onClick={() => goTo('goals')}><Target size={15} /><span>{missions} goal{missions === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-green" onClick={() => goTo('sort', 'next-actions')}><CheckCircle2 size={15} /><span>{actions} action{actions === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-orange" onClick={() => goTo('sort', 'problems')}><AlertCircle size={15} /><span>{loops} loop{loops === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-red" onClick={() => goTo('sort', 'anxiety-noise')}><Brain size={15} /><span>{noise} noise</span></button>
      <div className={`command-strip-item command-strip-load ${loadColor}`}><Zap size={15} /><span>{load} load</span></div>
    </div>
  );
}

function TodaySlot({ number, label, subtitle, value, fallback, tone, icon: Icon, onChange, onPromote, onComplete, linkedId, isSet }) {
  return (
    <div className={`today-slot today-command-card-slot today-command-${tone} ${linkedId ? 'linked-slot-card' : ''} ${isSet ? 'is-set' : 'needs-set'}`}>
      <div className="today-command-card-top">
        <div className="today-command-number">{number}</div>
        <div className="today-command-title-wrap">
          <div className="today-command-label-row">
            <Icon size={16} />
            <span>{label}</span>
          </div>
          <p>{subtitle}</p>
        </div>
        <Pill tone={isSet ? tone : 'slate'}>{isSet ? 'Set' : 'Open'}</Pill>
      </div>
      <textarea
        value={value}
        placeholder={fallback}
        onChange={(e) => onChange(e.target.value)}
        className={linkedId ? 'linked-slot' : ''}
      />
      <div className="today-command-card-actions">
        <button className="promote-btn today-command-pull" onClick={onPromote}><ArrowUpCircle size={14} /> Pull from list</button>
        {isSet && (
          <button className="promote-btn today-command-done" onClick={onComplete}><CheckCircle2 size={14} /> Done</button>
        )}
      </div>
    </div>
  );
}

function getBehaviorMode(thought) {
  const text = `${thought.text || ''} ${thought.nextAction || ''} ${thought.notes || ''}`.toLowerCase();
  if (['problems', 'decisions', 'anxiety-noise'].includes(thought.category)) return 'main';
  if (thought.category === 'maintenance' || thought.area === 'Health' || ['workout', 'gym', 'legs', 'sleep', 'food', 'eat', 'clean', 'room', 'laundry', 'supplement', 'recovery'].some((w) => text.includes(w))) return 'body';
  if (thought.category === 'someday' || ['learn', 'read', 'course', 'research', 'study', 'reflect', 'vision', 'future', 'skill'].some((w) => text.includes(w))) return 'life';
  if (['active-missions', 'next-actions', 'relationships', 'money-adult-life', 'waiting-on'].includes(thought.category)) return 'avoiding';
  return 'avoiding';
}

const behaviorModeMeta = {
  main: { label: 'Focus', tone: 'red', icon: Crosshair, description: 'Decisions, problems, deep work, and the thing stealing mental bandwidth.' },
  body: { label: 'Energy', tone: 'orange', icon: Activity, description: 'Body, recovery, stability, maintenance, and anything that keeps the machine running.' },
  life: { label: 'Growth', tone: 'amber', icon: Layers, description: 'Learning, reflection, future-building, skills, and long-term progress.' },
  avoiding: { label: 'Execution', tone: 'blue', icon: Zap, description: 'Ship it, respond, close the loop, move the real world forward.' },
};

function scoreBehaviorCandidate(thought, mode) {
  const daysOld = getDaysOld(thought.createdAt);
  let score = 0;
  if (getBehaviorMode(thought) === mode) score += 40;
  if (thought.pinned) score += 24;
  if (thought.relatedMissionId) score += 18;
  if (thought.dueDate) score += 14;
  if (thought.energy === 'High' && ['main', 'body', 'avoiding'].includes(mode)) score += 8;
  if (thought.energy === 'Low' && mode === 'body') score += 8;
  if (['decisions', 'problems'].includes(thought.category) && mode === 'main') score += 12;
  if (['next-actions', 'active-missions'].includes(thought.category) && mode === 'avoiding') score += 12;
  if (thought.category === 'maintenance' && mode === 'body') score += 12;
  if (thought.category === 'someday' && mode === 'life') score += 12;
  score += Math.min(daysOld, 10);
  return score;
}

function PromoteModal({ mode = 'avoiding', thoughts = [], activeMissions, tasks, loops, onSelect }) {
  const meta = behaviorModeMeta[mode] || behaviorModeMeta.avoiding;
  const ModeIcon = meta.icon;
  const candidates = (thoughts.length ? thoughts : [...activeMissions, ...tasks, ...loops])
    .filter((t) => t.status !== 'Done')
    .sort((a, b) => scoreBehaviorCandidate(b, mode) - scoreBehaviorCandidate(a, mode));
  const recommended = candidates.filter((t) => getBehaviorMode(t) === mode).slice(0, 6);
  const fallback = candidates.filter((t) => getBehaviorMode(t) !== mode).slice(0, 6);

  function renderItem(t) {
    const cat = getCategory(t.category);
    const CatIcon = cat.icon;
    return (
      <button key={t.id} className="promote-item promote-behavior-item" onClick={() => onSelect(t.id, t.text)}>
        <CatIcon size={15} className={`task-cat-icon-${cat.color}`} />
        <span>{t.text}</span>
        <Pill tone={cat.color}>{cat.short}</Pill>
      </button>
    );
  }

  return (
    <div className="promote-modal">
      <div className={`behavior-mode-explainer behavior-mode-${meta.tone}`}>
        <ModeIcon size={18} />
        <div>
          <strong>{meta.label}</strong>
          <p>{meta.description}</p>
        </div>
      </div>
      <p className="muted small">Pick up to 1-2 items for this mode. The app ranks by category fit, pinned items, related goals, due dates, energy, and stale open loops.</p>
      {recommended.length > 0 && (
        <div className="promote-group">
          <p className="promote-group-label">Best fits for {meta.label}</p>
          {recommended.map(renderItem)}
        </div>
      )}
      {fallback.length > 0 && (
        <div className="promote-group">
          <p className="promote-group-label">Other command items</p>
          {fallback.map(renderItem)}
        </div>
      )}
      {recommended.length === 0 && fallback.length === 0 && <EmptyState title="Nothing to pull yet" text="Capture or sort a few items first, then this mode will have smart candidates." />}
    </div>
  );
}

// ─── Manage Goals Modal ────────────────────────────────────────────────────
function ManageGoalsModal({ missions, pinnedGoalIds, onSave, onClose }) {
  const [selected, setSelected] = useState(pinnedGoalIds.length > 0 ? pinnedGoalIds : missions.slice(0, 3).map((m) => m.id));

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, id];
    });
  }

  return (
    <div className="manage-goals-modal">
      <p className="muted small">Choose up to 3 goals to pin to your Today view. Tap to toggle.</p>
      <div className="manage-goals-list">
        {missions.map((m) => {
          const areaMeta = getAreaMeta(m.area);
          const AreaIcon = areaMeta.icon;
          const isSelected = selected.includes(m.id);
          const isDisabled = !isSelected && selected.length >= 3;
          return (
            <button
              key={m.id}
              className={`manage-goal-item ${isSelected ? 'manage-goal-selected' : ''} ${isDisabled ? 'manage-goal-disabled' : ''} mission-card-area-${m.area.toLowerCase().replace(/[^a-z]/g, '')}`}
              onClick={() => !isDisabled && toggle(m.id)}
            >
              <div className="manage-goal-check">{isSelected ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}</div>
              <div className="manage-goal-body">
                <div className="mission-area-tag" style={{ color: `var(--cat-${areaMeta.color})` }}>
                  <AreaIcon size={12} /><span>{m.area}</span>
                </div>
                <span className="manage-goal-title">{m.title}</span>
              </div>
              {isSelected && <span className="manage-goal-badge">{selected.indexOf(m.id) + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="manage-goals-footer">
        <span className="muted small">{selected.length}/3 selected</span>
        <button className="primary-button compact" onClick={() => onSave(selected)} disabled={selected.length === 0}>
          <Check size={15} /> Save to Today
        </button>
      </div>
    </div>
  );
}

// ─── Close Day Modal ───────────────────────────────────────────────────────
const CLOSE_DAY_QUESTIONS = [
  { id: 'mission',    label: 'Mission',          question: 'Did I move a mission forward today?' },
  { id: 'body',       label: 'Body & Discipline', question: 'Did I keep my body and discipline standards?' },
  { id: 'courage',    label: 'Courage',           question: 'Did I face the thing I was avoiding?' },
  { id: 'mind',       label: 'Mind',              question: 'Did I quiet the noise and not let worry loops run me?' },
  { id: 'becoming',   label: 'Becoming',          question: 'Did I live today like the person I\'m trying to become?' },
];

function CloseDayModal({ thoughts, missions, onClose }) {
  const [step, setStep] = useState('gut'); // 'gut' | 'questions' | 'summary'
  const [gutCall, setGutCall] = useState('');
  const [answers, setAnswers] = useState({});
  const [copied, setCopied] = useState(false);

  const today = new Date();
  const todayKey = getLocalTodayKey();

  const todayDone = thoughts.filter((t) => t.status === 'Done' && getDayKey(t.completedAt || t.createdAt) === todayKey);
  const todayActive = thoughts.filter((t) => t.status !== 'Done' && getDayKey(t.createdAt) === todayKey);
  const missionsTouched = missions.filter((m) => todayDone.some((t) => t.relatedMissionId === m.id) || todayActive.some((t) => t.relatedMissionId === m.id));

  const score = Object.values(answers).filter(Boolean).length;

  function answerQuestion(id, val) {
    const updated = { ...answers, [id]: val };
    setAnswers(updated);
    const allAnswered = CLOSE_DAY_QUESTIONS.every((q) => updated[q.id] !== undefined);
    if (allAnswered) setTimeout(() => setStep('summary'), 300);
  }

  function buildSummary() {
    const dateStr = today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const lines = [];
    lines.push(`📅 Day Close — ${dateStr}`);
    lines.push(`Overall: ${gutCall}  |  Score: ${score}/5`);
    lines.push('');
    lines.push('✅ Completed Today:');
    if (todayDone.length) todayDone.forEach((t) => lines.push(`  • ${t.text}`));
    else lines.push('  • Nothing marked done today');
    lines.push('');
    lines.push('🎯 Missions Touched:');
    if (missionsTouched.length) missionsTouched.forEach((m) => lines.push(`  • ${m.title}`));
    else lines.push('  • None directly linked');
    lines.push('');
    lines.push('💭 New Thoughts Captured Today:');
    if (todayActive.length) todayActive.forEach((t) => lines.push(`  • ${t.text}${t.category ? ` (${t.category})` : ''}`));
    else lines.push('  • None');
    lines.push('');
    lines.push('📊 Score Breakdown:');
    CLOSE_DAY_QUESTIONS.forEach((q) => lines.push(`  ${answers[q.id] ? '✓' : '✗'} ${q.label} — ${q.question}`));
    lines.push('');
    lines.push('— paste into Apple Journal and write your personal review below —');
    return lines.join('\n');
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(buildSummary()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const currentQIndex = CLOSE_DAY_QUESTIONS.findIndex((q) => answers[q.id] === undefined);
  const currentQ = currentQIndex >= 0 ? CLOSE_DAY_QUESTIONS[currentQIndex] : null;

  return (
    <div className="closeday-modal">
      {step === 'gut' && (
        <div className="closeday-step">
          <p className="closeday-subtitle">Start with your gut. How did today go overall?</p>
          <div className="closeday-gut-row">
            {['Yes', 'Neutral', 'No'].map((opt) => (
              <button
                key={opt}
                className={`closeday-gut-btn ${gutCall === opt ? 'selected' : ''} gut-${opt.toLowerCase()}`}
                onClick={() => { setGutCall(opt); setStep('questions'); }}
              >
                {opt === 'Yes' ? '✓' : opt === 'No' ? '✗' : '~'} {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'questions' && currentQ && (
        <div className="closeday-step">
          <div className="closeday-progress">
            {CLOSE_DAY_QUESTIONS.map((q, i) => (
              <div key={q.id} className={`closeday-progress-dot ${answers[q.id] !== undefined ? 'done' : i === currentQIndex ? 'active' : ''}`} />
            ))}
          </div>
          <p className="closeday-q-label">{currentQ.label}</p>
          <p className="closeday-q-text">{currentQ.question}</p>
          <div className="closeday-yn-row">
            <button className="closeday-yn-btn yn-yes" onClick={() => answerQuestion(currentQ.id, true)}>Yes — +1</button>
            <button className="closeday-yn-btn yn-no" onClick={() => answerQuestion(currentQ.id, false)}>No</button>
          </div>
          <p className="closeday-progress-label">{currentQIndex + 1} of {CLOSE_DAY_QUESTIONS.length}</p>
        </div>
      )}

      {step === 'summary' && (
        <div className="closeday-step">
          <div className="closeday-score-block">
            <div className="closeday-score-num">{score}<span>/5</span></div>
            <div className="closeday-score-gut">Overall: <strong>{gutCall}</strong></div>
          </div>
          <div className="closeday-score-bars">
            {CLOSE_DAY_QUESTIONS.map((q) => (
              <div key={q.id} className={`closeday-bar-row ${answers[q.id] ? 'bar-yes' : 'bar-no'}`}>
                <span className="closeday-bar-icon">{answers[q.id] ? '✓' : '✗'}</span>
                <span className="closeday-bar-label">{q.label}</span>
              </div>
            ))}
          </div>
          <div className="closeday-summary-box">
            <pre className="closeday-summary-text">{buildSummary()}</pre>
          </div>
          <button className="primary-button" onClick={copyToClipboard}>
            {copied ? <><Check size={17} /> Copied!</> : <><Copy size={17} /> Copy for Apple Journal</>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Capture ───────────────────────────────────────────────────────────────
function CaptureView({ addThought, missions, setActiveTab }) {
  return (
    <section className="screen stack">
      <div className="section-header"><div><p className="eyebrow">Brain Dump</p><h2>Capture</h2><p className="muted">Get it out of your head. Sort later.</p></div></div>
      <CaptureForm addThought={(input) => { addThought(input); setActiveTab('sort'); }} missions={missions} />
    </section>
  );
}

function CaptureForm({ addThought, missions, compact = false }) {
  const [form, setForm] = useState({ text: '', category: '', area: 'Personal', nextAction: '', notes: '', dueDate: '', energy: 'Medium', relatedMissionId: '' });
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
        <textarea className="big-input" placeholder="Dump the thought here. Sorting can happen after." value={form.text} onChange={(e) => set('text', e.target.value)} autoFocus={compact} />
      </Field>
      <div className="form-grid">
        <Field label="Category">
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            <option value="">Unsorted Inbox</option>
            {categoryTiers.map((tier) => (
              <optgroup key={tier.id} label={tier.label}>
                {categories.filter((c) => c.tier === tier.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Life Area">
          <select value={form.area} onChange={(e) => set('area', e.target.value)}>{lifeAreas.map((a) => <option key={a}>{a}</option>)}</select>
        </Field>
      </div>
      {selected && (
        <div className={`category-hint hint-${selected.color}`}>
          <selected.icon size={18} /><div><strong>{selected.label}</strong><p>{selected.prompt}</p></div>
        </div>
      )}
      <Field label="Next Action / Clarifying Step"><input placeholder="What is the very next physical step?" value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Due / Follow-up Date"><input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Energy Required"><select value={form.energy} onChange={(e) => set('energy', e.target.value)}>{energyLevels.map((l) => <option key={l}>{l}</option>)}</select></Field>
      </div>
      <Field label="Related Goal">
        <select value={form.relatedMissionId} onChange={(e) => set('relatedMissionId', e.target.value)}>
          <option value="">None</option>
          {missions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </Field>
      <Field label="Notes"><textarea placeholder="Context, why it matters, anything you don't want to forget." value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      <button className="primary-button" type="submit"><Save size={17} /> Save to Command Center</button>
    </form>
  );
}

// ─── Sort View ─────────────────────────────────────────────────────────────
function SortView({ thoughts, unsorted, selectedCategory, setSelectedCategory, query, setQuery, filteredThoughts, updateThought, deleteThought, convertThought, setModal }) {
  const [collapsedTiers, setCollapsedTiers] = useState({});
  function toggleTier(id) { setCollapsedTiers((prev) => ({ ...prev, [id]: !prev[id] })); }
  return (
    <section className="screen stack">
      <div className="section-header">
        <div><p className="eyebrow">Sort & Convert</p><h2>Every Thought Gets a Role</h2><p className="muted">Act, solve, decide, wait, maintain, park, or let go.</p></div>
        <Pill tone={unsorted.length ? 'red' : 'green'}>{unsorted.length} unsorted</Pill>
      </div>
      {unsorted.length > 0 && (
        <div className="card inbox-triage">
          <div className="mini-header"><Inbox size={18} /><h3>Inbox — Sort These First</h3></div>
          <div className="thought-list">
            {unsorted.slice(0, 3).map((t) => <TriageCard key={t.id} thought={t} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />)}
          </div>
        </div>
      )}
      <div className="tier-nav">
        {categoryTiers.map((tier) => {
          const tierCats = categories.filter((c) => c.tier === tier.id);
          const isCollapsed = collapsedTiers[tier.id];
          return (
            <div key={tier.id} className={`tier-group tier-group-${tier.color}`}>
              <button className="tier-header" onClick={() => toggleTier(tier.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <tier.icon size={16} className={`tier-icon tier-icon-${tier.color}`} />
                  <div><span className="tier-label">{tier.label}</span><span className="tier-desc">{tier.description}</span></div>
                </div>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              {!isCollapsed && (
                <div className="tier-chips">
                  {tierCats.map((cat) => {
                    const CIcon = cat.icon;
                    const count = thoughts.filter((t) => t.category === cat.id).length;
                    const staleCt = thoughts.filter((t) => t.category === cat.id && stalenessLabel(getDaysOld(t.createdAt), cat.id)?.urgent).length;
                    return (
                      <button key={cat.id} className={`category-chip ${selectedCategory === cat.id ? `active chip-active-${cat.color}` : ''}`} onClick={() => setSelectedCategory(cat.id)}>
                        <CIcon size={16} /><span>{cat.short}</span><small>{count}</small>
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
      <div className="search-bar"><Search size={18} /><input placeholder="Search this category..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <CategoryDetail category={getCategory(selectedCategory)} thoughts={filteredThoughts} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />
    </section>
  );
}

function CategoryDetail({ category, thoughts, updateThought, deleteThought, convertThought, setModal }) {
  const CIcon = category.icon;
  return (
    <div className="card category-detail">
      <div className="section-header">
        <div className="category-title"><IconBadge icon={CIcon} tone={category.color} /><div><h2>{category.label}</h2><p className="muted">{category.description}</p></div></div>
      </div>
      {thoughts.length ? (
        <div className="thought-list">
          {thoughts.map((t, i) => <ThoughtCard key={t.id} thought={t} index={i+1} updateThought={updateThought} deleteThought={deleteThought} convertThought={convertThought} setModal={setModal} />)}
        </div>
      ) : <EmptyState title="Nothing here yet" text="Captured items sorted into this category will appear here." />}
    </div>
  );
}

function TriageCard({ thought, updateThought, deleteThought, convertThought, setModal }) {
  return (
    <article className="thought-card triage">
      <div className="thought-main"><h3>{thought.text}</h3><p>{thought.notes || 'Choose what this should become.'}</p></div>
      <ConversionButtons thought={thought} convertThought={convertThought} />
      <div className="card-actions">
        <button className="text-button" onClick={() => setModal({ type: 'edit-thought', thought })}><Edit3 size={15} /> Edit</button>
        <button className="danger-button" onClick={() => deleteThought(thought.id)}><Trash2 size={15} /> Delete</button>
      </div>
    </article>
  );
}

function ThoughtCard({ thought, updateThought, deleteThought, convertThought, setModal, compact = false, index }) {
  const category = getCategory(thought.category);
  const CIcon = category.icon;
  const stale = stalenessLabel(getDaysOld(thought.createdAt), thought.category);
  const itemLabel = categoryItemLabel[thought.category] || 'Item';
  const areaMeta = getAreaMeta(thought.area);
  const AreaIcon = areaMeta.icon;
  const energyTone = thought.energy === 'Low' ? 'slate' : thought.energy === 'High' ? 'rose' : 'amber';
  return (
    <article className={`thought-card ${compact ? 'compact-card' : ''}`}>
      <div className="thought-topline">
        <div className="thought-labels">
          <Pill tone={category.color}><CIcon size={13} /> {category.short}</Pill>
          <Pill tone={areaMeta.color}><AreaIcon size={13} /> {thought.area}</Pill>
          {thought.dueDate && <Pill tone="default"><CalendarDays size={13} /> {formatDate(thought.dueDate)}</Pill>}
          {thought.energy && <Pill tone={energyTone}><EnergyIcon level={thought.energy} /> {thought.energy}</Pill>}
          {stale && <Pill tone={stale.urgent ? 'red' : 'slate'}><Clock size={11} /> {stale.label}</Pill>}
        </div>
        {!compact && <button className="icon-button" onClick={() => updateThought(thought.id, { pinned: !thought.pinned })}><Flag size={16} className={thought.pinned ? 'filled-flag' : ''} /></button>}
      </div>
      <div className="thought-main">
        <div className="thought-item-header">
          {index != null && <span className="thought-number">{index}</span>}
          <span className="thought-item-label">{itemLabel}</span>
        </div>
        <h3>{thought.text}</h3>
        {thought.nextAction && <div className="thought-section"><span className="thought-section-label">Next Physical Step</span><p className="next-action"><ArrowRight size={15} /> {thought.nextAction}</p></div>}
        {thought.notes && <div className="thought-section"><span className="thought-section-label">Notes</span><p className="thought-section-text">{thought.notes}</p></div>}
        {thought.truth && <div className="thought-section"><span className="thought-section-label">Grounded Truth</span><p className="thought-section-text">{thought.truth}</p></div>}
        {thought.exaggeration && <div className="thought-section"><span className="thought-section-label">Fear Loop / Exaggeration</span><p className="thought-section-text">{thought.exaggeration}</p></div>}
        {thought.waitingOn && <div className="thought-section"><span className="thought-section-label">Waiting On</span><p className="thought-section-text">{thought.waitingOn}</p></div>}
        {thought.decisionOptions && <div className="thought-section"><span className="thought-section-label">Options</span><p className="thought-section-text">{thought.decisionOptions}</p></div>}
      </div>
      {thought.category === 'anxiety-noise' && !compact && (
        <div className="noise-bridge">
          <p className="noise-bridge-label">Is there a real action hiding here?</p>
          <button className="convert-action-btn" onClick={() => convertThought(thought, 'task')}><Zap size={14} /> Yes — convert to task</button>
        </div>
      )}
      {!compact && <ConversionButtons thought={thought} convertThought={convertThought} />}
      <div className="card-actions">
        <select value={thought.status} onChange={(e) => updateThought(thought.id, { status: e.target.value })}>{statuses.map((s) => <option key={s}>{s}</option>)}</select>
        <button className="text-button" onClick={() => setModal({ type: 'edit-thought', thought })}><Edit3 size={15} /> Edit</button>
        {deleteThought && <button className="danger-button" onClick={() => deleteThought(thought.id)}><Trash2 size={15} /> Delete</button>}
      </div>
    </article>
  );
}

function ConversionButtons({ thought, convertThought }) {
  const buttons = [
    { id: 'task', label: 'Task', icon: CheckCircle2 }, { id: 'problem', label: 'Problem', icon: HelpCircle },
    { id: 'decision', label: 'Decision', icon: Compass }, { id: 'waiting', label: 'Waiting', icon: TimerReset },
    { id: 'someday', label: 'Park It', icon: Archive }, { id: 'noise', label: 'Noise', icon: Brain },
  ];
  return (
    <div className="convert-row">
      {buttons.map((b) => { const BIcon = b.icon; return <button key={b.id} onClick={() => convertThought(thought, b.id)}><BIcon size={13} /> {b.label}</button>; })}
    </div>
  );
}

function ThoughtEditForm({ thought, missions, updateThought }) {
  const [form, setForm] = useState({ ...thought });
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function submit(e) { e.preventDefault(); updateThought(thought.id, form); }
  return (
    <form className="capture-form" onSubmit={submit}>
      <Field label="Title / Thought"><textarea className="big-input" value={form.text} onChange={(e) => set('text', e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Category">
          <select value={form.category || ''} onChange={(e) => set('category', e.target.value)}>
            <option value="">Unsorted</option>
            {categoryTiers.map((tier) => <optgroup key={tier.id} label={tier.label}>{categories.filter((c) => c.tier === tier.id).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
          </select>
        </Field>
        <Field label="Area"><select value={form.area || 'Personal'} onChange={(e) => set('area', e.target.value)}>{lifeAreas.map((a) => <option key={a}>{a}</option>)}</select></Field>
      </div>
      <Field label="Next Action"><input value={form.nextAction || ''} onChange={(e) => set('nextAction', e.target.value)} /></Field>
      <div className="form-grid">
        <Field label="Due / Follow-up"><input type="date" value={form.dueDate || ''} onChange={(e) => set('dueDate', e.target.value)} /></Field>
        <Field label="Status"><select value={form.status || 'Open'} onChange={(e) => set('status', e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </div>
      <Field label="Energy Required"><select value={form.energy || 'Medium'} onChange={(e) => set('energy', e.target.value)}>{energyLevels.map((l) => <option key={l}>{l}</option>)}</select></Field>
      <Field label="Related Goal">
        <select value={form.relatedMissionId || ''} onChange={(e) => set('relatedMissionId', e.target.value)}>
          <option value="">None</option>
          {missions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </Field>
      {form.category === 'decisions' && <Field label="Options"><textarea value={form.decisionOptions || ''} onChange={(e) => set('decisionOptions', e.target.value)} placeholder="Option A / Option B / Current leaning" /></Field>}
      {form.category === 'waiting-on' && <Field label="Waiting On"><input value={form.waitingOn || ''} onChange={(e) => set('waitingOn', e.target.value)} placeholder="Person, payment, email, answer..." /></Field>}
      {form.category === 'anxiety-noise' && (
        <>
          <Field label="Grounded Truth"><textarea value={form.truth || ''} onChange={(e) => set('truth', e.target.value)} placeholder="What is actually true?" /></Field>
          <Field label="Exaggeration / Fear Loop"><textarea value={form.exaggeration || ''} onChange={(e) => set('exaggeration', e.target.value)} placeholder="What part is your brain exaggerating?" /></Field>
        </>
      )}
      <Field label="Notes"><textarea value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
      <button className="primary-button" type="submit"><Save size={17} /> Save Changes</button>
    </form>
  );
}

// ─── Goals View ────────────────────────────────────────────────────────────
const goalAreas = ['Work', 'School', 'Money', 'Health', 'Relationships', 'Family', 'Personal', 'App/Projects', 'Future', 'Other'];
const goalStatuses = ['Open', 'On Track', 'Slipping', 'Blocked', 'Done'];
const goalAreaColors = {
  'Work': 'amber', 'School': 'purple', 'Money': 'emerald', 'Health': 'green',
  'Relationships': 'pink', 'Family': 'orange', 'Personal': 'teal',
  'App/Projects': 'yellow', 'Future': 'slate', 'Other': 'slate',
};

function GoalsView({ missions, thoughts, addMission, updateMission, deleteMission, setActiveTab, setSelectedCategory, highlightGoalId, setHighlightGoalId }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work', targetDate: '' });
  const [customArea, setCustomArea] = useState('');
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function submit(e) {
    e.preventDefault();
    const finalArea = form.area === 'Other' && customArea.trim() ? customArea.trim() : form.area;
    addMission({ ...form, area: finalArea });
    setForm({ title: '', why: '', weeklyGoal: '', nextAction: '', status: 'Open', area: 'Work', targetDate: '' });
    setCustomArea('');
    setShowForm(false);
  }

  const byArea = useMemo(() => {
    const map = {};
    missions.forEach((m) => {
      if (!map[m.area]) map[m.area] = [];
      map[m.area].push(m);
    });
    return Object.entries(map);
  }, [missions]);

  return (
    <section className="screen stack">
      <div className="section-header goals-page-header">
        <div className="goals-header-copy"><p className="eyebrow">Big Picture</p><h2>Goals</h2><p className="muted">Your major life objectives. Active tasks in Command serve these.</p></div>
        <button className="primary-button compact" onClick={() => setShowForm((v) => !v)}><Plus size={16} /> Add Goal</button>
      </div>

      {showForm && (
        <form className="card capture-form" onSubmit={submit}>
          <div className="mini-header"><Mountain size={18} /><h3>New Goal</h3></div>
          <Field label="Goal"><input placeholder="e.g. Launch my first app" value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Why it matters"><textarea value={form.why} onChange={(e) => set('why', e.target.value)} placeholder="What does achieving this unlock?" /></Field>
          <div className="form-grid">
            <Field label="Life Area">
              <select value={form.area} onChange={(e) => set('area', e.target.value)}>
                {goalAreas.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            {form.area === 'Other' && <Field label="Custom Area"><input value={customArea} onChange={(e) => setCustomArea(e.target.value)} placeholder="Name it" /></Field>}
            <Field label="Status"><select value={form.status} onChange={(e) => set('status', e.target.value)}>{goalStatuses.map((s) => <option key={s}>{s}</option>)}</select></Field>
          </div>
          <div className="form-grid">
            <Field label="Target Date (optional)"><input type="date" value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></Field>
            <Field label="This week's push"><input value={form.weeklyGoal} onChange={(e) => set('weeklyGoal', e.target.value)} placeholder="What moves this forward this week?" /></Field>
          </div>
          <Field label="Next action"><input value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)} placeholder="First concrete step" /></Field>
          <button className="primary-button" type="submit"><Target size={17} /> Save Goal</button>
        </form>
      )}

      {missions.length === 0 && !showForm && (
        <div className="card"><EmptyState icon={Mountain} title="No goals yet" text="Add your first big-picture goal to start connecting your daily actions to your life direction." /></div>
      )}

      {byArea.map(([area, areaGoals]) => {
        const areaMeta = getAreaMeta(area);
        return (
          <div key={area} className="goals-area-group">
            <div className="goals-area-header">
              <IconBadge icon={areaMeta.icon} tone={areaMeta.color} />
              <h3 className="goals-area-label">{area}</h3>
              <span className="goals-area-count">{areaGoals.length} goal{areaGoals.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="goals-list">
              {areaGoals.map((m) => {
                const linked = thoughts.filter((t) => t.relatedMissionId === m.id);
                const linkedActive = linked.filter((t) => t.status !== 'Done');
                const linkedDone = linked.filter((t) => t.status === 'Done');
                return (
                  <GoalCard
                    key={m.id} goal={m} linkedActive={linkedActive} linkedDone={linkedDone}
                    updateMission={updateMission} deleteMission={deleteMission}
                    setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
                    isHighlighted={highlightGoalId === m.id}
                    onHighlightClear={() => setHighlightGoalId('')}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function GoalCard({ goal, linkedActive, linkedDone, updateMission, deleteMission, setActiveTab, setSelectedCategory, isHighlighted, onHighlightClear }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const cardRef = React.useRef(null);

  useEffect(() => {
    if (isHighlighted) {
      setExpanded(true);
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (onHighlightClear) setTimeout(onHighlightClear, 1800);
      }, 80);
    }
  }, [isHighlighted]);

  const statusTone = goal.status === 'On Track' ? 'green' : goal.status === 'Slipping' ? 'amber' : goal.status === 'Blocked' ? 'red' : goal.status === 'Done' ? 'slate' : 'default';
  const progress = linkedDone.length + linkedActive.length > 0
    ? Math.round((linkedDone.length / (linkedDone.length + linkedActive.length)) * 100)
    : 0;

  return (
    <article className={`goal-card ${isHighlighted ? 'goal-card-highlighted' : ''}`} ref={cardRef}>
      <div className="goal-card-top">
        <div className="goal-card-main">
          <div className="goal-card-title-row">
            <h3 className="goal-title">{goal.title}</h3>
            <Pill tone={statusTone}>{goal.status}</Pill>
          </div>
          {goal.why && <p className="goal-why">{goal.why}</p>}
          {goal.targetDate && (
            <p className="goal-target-date"><CalendarDays size={12} /> Target: {formatDate(goal.targetDate)}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="icon-button" title="Edit goal" onClick={() => { setEditing((v) => !v); setExpanded(true); }}>
            <Edit3 size={15} />
          </button>
          <button className="icon-button" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </div>

      {/* Status always visible */}
      <select value={goal.status} onChange={(e) => updateMission(goal.id, { status: e.target.value })}
        style={{ width: '100%', borderRadius: 999, fontSize: '0.8rem', padding: '7px 12px' }}>
        {goalStatuses.map((s) => <option key={s}>{s}</option>)}
      </select>

      {/* Progress bar */}
      {(linkedActive.length + linkedDone.length) > 0 && (
        <div className="goal-progress-row">
          <div className="goal-progress-bar">
            <div className="goal-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="goal-progress-label">{linkedDone.length}/{linkedDone.length + linkedActive.length} tasks done</span>
        </div>
      )}

      {expanded && (
        <div className="goal-expanded">
          {!editing && goal.weeklyGoal && (
            <div className="goal-section">
              <span className="goal-section-label">This week's push</span>
              <p className="goal-section-text">{goal.weeklyGoal}</p>
            </div>
          )}
          {!editing && goal.nextAction && (
            <div className="goal-section">
              <span className="goal-section-label">Next action</span>
              <p className="goal-section-text"><ArrowRight size={13} /> {goal.nextAction}</p>
            </div>
          )}

          {editing && (
            <div className="goal-card-actions">
              <div className="form-grid" style={{ gap: 8 }}>
                <Field label="This week's push">
                  <input value={goal.weeklyGoal} onChange={(e) => updateMission(goal.id, { weeklyGoal: e.target.value })} />
                </Field>
                <Field label="Target date">
                  <input type="date" value={goal.targetDate || ''} onChange={(e) => updateMission(goal.id, { targetDate: e.target.value })} />
                </Field>
              </div>
              <Field label="Next action">
                <input value={goal.nextAction} onChange={(e) => updateMission(goal.id, { nextAction: e.target.value })} />
              </Field>
              <Field label="Why it matters">
                <textarea value={goal.why} onChange={(e) => updateMission(goal.id, { why: e.target.value })} />
              </Field>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="secondary-button compact" onClick={() => setEditing(false)}><Check size={14} /> Done editing</button>
                <button className="danger-button" onClick={() => deleteMission(goal.id)}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          )}

          {/* Linked active items */}
          {linkedActive.length > 0 && (
            <div className="goal-section">
              <span className="goal-section-label">Active items serving this goal ({linkedActive.length})</span>
              <div className="goal-linked-list">
                {linkedActive.map((t) => {
                  const cat = getCategory(t.category);
                  return (
                    <button key={t.id} className="goal-linked-item goal-linked-btn" onClick={() => { setSelectedCategory(t.category); setActiveTab('sort'); }}>
                      <cat.icon size={13} className={`task-cat-icon-${cat.color}`} />
                      <span>{t.text}</span>
                      <Pill tone={cat.color}>{cat.short}</Pill>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {linkedDone.length > 0 && (
            <div className="goal-section">
              <span className="goal-section-label">Completed ({linkedDone.length})</span>
              <div className="goal-linked-list">
                {linkedDone.slice(0, 5).map((t) => (
                  <div key={t.id} className="goal-linked-item done-linked">
                    <CheckCircle2 size={13} />
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linkedActive.length === 0 && linkedDone.length === 0 && (
            <p className="muted small">No active items linked yet. Set "Related Goal" when capturing a thought.</p>
          )}

          {!editing && (
            <button className="secondary-button compact" onClick={() => { setSelectedCategory('next-actions'); setActiveTab('sort'); }}>
              <Layers size={14} /> Go to Sort
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Progress ──────────────────────────────────────────────────────────────
function ProgressView({ doneThoughts, activeThoughts, reviews, saveReview, subTab, setSubTab, goToCategory, updateThought, setModal }) {
  return (
    <section className="screen stack">
      <div className="section-header"><div><p className="eyebrow">BlakeOS</p><h2>Progress</h2></div></div>
      <div className="subtab-row">
        <button className={`subtab-btn ${subTab === 'accomplishments' ? 'active' : ''}`} onClick={() => setSubTab('accomplishments')}><Trophy size={15} /> Accomplishments</button>
        <button className={`subtab-btn ${subTab === 'review' ? 'active' : ''}`} onClick={() => setSubTab('review')}><RefreshCw size={15} /> Weekly Review</button>
      </div>
      {subTab === 'accomplishments' && <AccomplishmentsTab doneThoughts={doneThoughts} updateThought={updateThought} setModal={setModal} />}
      {subTab === 'review' && <ReviewTab activeThoughts={activeThoughts} reviews={reviews} saveReview={saveReview} goToCategory={goToCategory} />}
    </section>
  );
}

function AccomplishmentsTab({ doneThoughts, updateThought, setModal }) {
  const byDay = useMemo(() => {
    const map = {};
    doneThoughts.forEach((t) => {
      const key = getDayKey(t.completedAt || t.createdAt);
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [doneThoughts]);

  // All days expanded by default; user can collapse
  const [collapsedDays, setCollapsedDays] = useState({});
  function toggleDay(key) { setCollapsedDays((prev) => ({ ...prev, [key]: !prev[key] })); }

  const thisWeekCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return doneThoughts.filter((t) => new Date(t.completedAt || t.createdAt).getTime() >= cutoff).length;
  }, [doneThoughts]);

  const previousDayCount = byDay[1] ? byDay[1][1].length : 0;
  const proofDays = byDay.length;
  const latestProof = byDay[0] ? byDay[0][1].length : 0;

  if (doneThoughts.length === 0) {
    return (
      <div className="card accomplishment-empty-card">
        <EmptyState icon={Trophy} title="No proof yet" text="When you mark something Done, it becomes evidence that you are becoming the person you said you wanted to be." />
      </div>
    );
  }
  return (
    <div className="stack accomplishments-page">
      <div className="accomplishment-hero-card">
        <div className="accomplishment-hero-copy">
          <p className="eyebrow">Identity Evidence</p>
          <h2>Proof You<br /><span className="hero-accent">Kept Your Word.</span></h2>
          <p>Every action completed is evidence.<br />Not motivation. Not intention. Proof.</p>
        </div>
        <div className="proof-score-card">
          <Trophy size={22} />
          <strong>{thisWeekCount}</strong>
          <span>WORDS HONORED<br />THIS WEEK</span>
        </div>
      </div>

      <div className="accomplish-summary identity-summary">
        <div className="accomplish-stat identity-stat">
          <div className="identity-stat-icon identity-stat-icon--fire"><Flame size={18} /></div>
          <strong>{previousDayCount}</strong>
          <span>Yesterday</span>
        </div>
        <div className="accomplish-stat identity-stat">
          <div className="identity-stat-icon identity-stat-icon--calendar"><CalendarDays size={18} /></div>
          <strong>{thisWeekCount}</strong>
          <span>This Week</span>
        </div>
        <div className="accomplish-stat identity-stat">
          <div className="identity-stat-icon identity-stat-icon--target"><Target size={18} /></div>
          <strong>{doneThoughts.length}</strong>
          <span>Total</span>
        </div>
        <div className="accomplish-stat identity-stat">
          <div className="identity-stat-icon identity-stat-icon--star"><Star size={18} /></div>
          <strong>{proofDays}</strong>
          <span>Days Strong</span>
        </div>
      </div>

      <div className="evidence-section-header">
        <div><p className="eyebrow">Evidence Timeline</p><h2>Days You Kept Your Word</h2><p className="muted">Grouped by day — the record of who you're becoming.</p></div>
      </div>

      {byDay.map(([dayKey, items]) => {
        const byCat = {};
        const isCollapsed = collapsedDays[dayKey];
        items.forEach((t) => { const cid = t.category || 'unsorted'; if (!byCat[cid]) byCat[cid] = []; byCat[cid].push(t); });
        return (
          <div key={dayKey} className="card accomplish-day identity-day-card">
            <button className="accomplish-day-header accomplish-day-toggle identity-day-toggle" onClick={() => toggleDay(dayKey)}>
              <div className="identity-day-medal"><CheckCircle2 size={15} /></div>
              <div style={{ flex: 1 }}>
                <p className="accomplish-day-date">{formatDateFull(dayKey)}</p>
                <p className="accomplish-day-count">{items.length} proof point{items.length === 1 ? '' : 's'} logged</p>
              </div>
              <span className="identity-day-badge">Evidence</span>
              {isCollapsed ? <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {!isCollapsed && (
              <div className="accomplish-cat-list identity-evidence-list">
                {Object.entries(byCat).map(([catId, catItems]) => {
                  const cat = catId === 'unsorted' ? { label: 'Unsorted', short: 'Unsorted', icon: CircleDashed, color: 'slate' } : getCategory(catId);
                  const CatIcon = cat.icon;
                  return (
                    <div key={catId} className="accomplish-cat-group identity-cat-group">
                      <div className="accomplish-cat-header identity-cat-header"><CatIcon size={14} className={`task-cat-icon-${cat.color}`} /><span className={`accomplish-cat-label cat-label-${cat.color}`}>{cat.label}</span><span className="accomplish-cat-count">{catItems.length}</span></div>
                      <div className="accomplish-items identity-proof-items">
                        {catItems.map((t) => (
                          <AccomplishItem key={t.id} t={t} updateThought={updateThought} setModal={setModal} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AccomplishItem({ t, updateThought, setModal }) {
  const [showMove, setShowMove] = useState(false);
  const currentDay = getDayKey(t.completedAt || t.createdAt);

  function moveToDay(newDate) {
    // Build a completedAt timestamp at noon local time on the chosen date
    const [year, month, day] = newDate.split('-').map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    updateThought(t.id, { completedAt: d.toISOString() });
    setShowMove(false);
  }

  return (
    <div className="accomplish-item accomplish-item-editable">
      <CheckCircle2 size={14} className="accomplish-check" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="accomplish-item-text">{t.text}</span>
        {showMove && (
          <div className="accomplish-move-row">
            <input
              type="date"
              defaultValue={currentDay}
              style={{ flex: 1, fontSize: '0.78rem', padding: '4px 8px' }}
              onChange={(e) => { if (e.target.value) moveToDay(e.target.value); }}
            />
            <button className="accomplish-action-btn" onClick={() => setShowMove(false)}><X size={12} /></button>
          </div>
        )}
      </div>
      <div className="accomplish-item-actions">
        <button className="accomplish-action-btn" title="Move to day" onClick={() => setShowMove((v) => !v)}>
          <CalendarDays size={13} />
        </button>
        <button className="accomplish-action-btn" title="Edit" onClick={() => setModal({ type: 'edit-thought', thought: t })}>
          <Edit3 size={13} />
        </button>
        <button className="accomplish-action-btn revert-btn" title="Revert to active" onClick={() => updateThought(t.id, { status: 'Open', completedAt: '' })}>
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

function ReviewTab({ activeThoughts, reviews, saveReview, goToCategory }) {
  const [review, setReview] = useState({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  function set(key, value) { setReview((prev) => ({ ...prev, [key]: value })); }
  function submit(e) { e.preventDefault(); saveReview(review); setReview({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' }); }
  const counts = categories.map((c) => ({
    ...c,
    count: activeThoughts.filter((t) => t.category === c.id).length,
    staleCount: activeThoughts.filter((t) => t.category === c.id && stalenessLabel(getDaysOld(t.createdAt), c.id)?.urgent).length,
  }));
  return (
    <div className="stack">
      <div className="card">
        <div className="mini-header"><h3>What's in each category</h3></div>
        <div className="stats-grid">
          {counts.map((item) => {
            const SIcon = item.icon;
            return (
              <button key={item.id} className={`stat-card stat-card-btn stat-card-${item.color}`} onClick={() => goToCategory(item.id)}>
                <SIcon size={16} className={`stat-icon-${item.color}`} /><strong>{item.count}</strong><span>{item.short}</span>
                {item.staleCount > 0 && <span className="stat-stale">{item.staleCount} stale</span>}
              </button>
            );
          })}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Tap any category to jump to it in Sort.</p>
      </div>
      <form className="card capture-form" onSubmit={submit}>
        <div className="mini-header"><RefreshCw size={18} /><h3>Sunday Life Reset</h3></div>
        <Field label="What improved this week?"><textarea value={review.improved} onChange={(e) => set('improved', e.target.value)} /></Field>
        <Field label="What did I avoid?"><textarea value={review.avoided} onChange={(e) => set('avoided', e.target.value)} /></Field>
        <Field label="What actually mattered?"><textarea value={review.mattered} onChange={(e) => set('mattered', e.target.value)} /></Field>
        <Field label="What kept stressing me out?"><textarea value={review.stress} onChange={(e) => set('stress', e.target.value)} /></Field>
        <Field label="Next week's 3 priorities"><textarea value={review.nextWeek} onChange={(e) => set('nextWeek', e.target.value)} placeholder={"1. ...\n2. ...\n3. ..."} /></Field>
        <button className="primary-button" type="submit"><Save size={17} /> Save Weekly Review</button>
      </form>
      <div className="card">
        <div className="mini-header"><Clock3 size={18} /><h3>Past Reviews</h3></div>
        {reviews.length ? (
          <div className="thought-list">
            {reviews.map((item) => (
              <article className="review-card" key={item.id}>
                <p className="eyebrow">{formatDate(item.createdAt)}</p>
                <h3>Next Week's 3</h3><p>{item.nextWeek || 'No priorities written.'}</p>
                <details><summary>Open full review</summary>
                  <p><strong>Improved:</strong> {item.improved}</p>
                  <p><strong>Avoided:</strong> {item.avoided}</p>
                  <p><strong>Mattered:</strong> {item.mattered}</p>
                  <p><strong>Stress:</strong> {item.stress}</p>
                </details>
              </article>
            ))}
          </div>
        ) : <EmptyState title="No reviews yet" text="Save your first weekly reset to start building clarity over time." />}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
