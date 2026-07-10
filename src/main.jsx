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

const PRIORITY_SIGNALS = [
  { id: 'time-locked', label: 'Time-Locked', icon: '🔒', tone: 'rose' },
  { id: 'multiplier',  label: 'Multiplier',  icon: '✖️', tone: 'purple' },
  { id: 'coast',       label: 'Coast',       icon: '⛵', tone: 'slate' },
];

const SLOT_META = {
  main:     { label: 'Focus',     tone: 'red',    icon: Crosshair, textKey: 'mainMissionText', doneKey: 'mainDone', idKey: 'mainMissionId' },
  body:     { label: 'Energy',    tone: 'orange', icon: Activity,  textKey: 'bodyWin',         doneKey: 'bodyDone', idKey: null },
  life:     { label: 'Growth',    tone: 'amber',  icon: Layers,    textKey: 'lifeWinText',     doneKey: 'lifeDone', idKey: 'lifeWinId' },
  avoiding: { label: 'Execution', tone: 'blue',   icon: Zap,       textKey: 'avoiding',        doneKey: 'avoidingDone', idKey: null },
};

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

// ── Date-key math — always parse YYYY-MM-DD parts directly, never new Date(string) ──
function parseKey(key) {
  return new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10) - 1, parseInt(key.slice(8, 10), 10));
}
function addDaysToKey(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function daysBetweenKeys(fromKey, toKey) {
  return Math.round((parseKey(toKey) - parseKey(fromKey)) / 86400000);
}
function dayShortLabel(key, todayKey) {
  if (key === todayKey) return 'Today';
  if (key === addDaysToKey(todayKey, 1)) return 'Tomorrow';
  const d = parseKey(key);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}
function weekStartKey(key) {
  // Monday-start weeks
  const d = parseKey(key);
  const day = d.getDay();
  return addDaysToKey(key, day === 0 ? -6 : 1 - day);
}
function weekRangeLabel(weekKey) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const s = parseKey(weekKey);
  const e = parseKey(addDaysToKey(weekKey, 6));
  if (s.getMonth() === e.getMonth()) return `${months[s.getMonth()]} ${s.getDate()}\u2013${e.getDate()}`;
  return `${months[s.getMonth()]} ${s.getDate()} \u2013 ${months[e.getMonth()]} ${e.getDate()}`;
}

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
    prioritySignals: row.priority_signals ? row.priority_signals.split(',').filter(Boolean) : [],
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
    priority_signals: (t.prioritySignals && t.prioritySignals.length) ? t.prioritySignals.join(',') : null,
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
const DEFAULT_SLOT_TEXT = {
  mainMissionText: 'Pick one thing that moves life forward today.',
  bodyWin: 'Do one action that keeps your body/life stable.',
  lifeWinText: 'Clear one small real-life open loop.',
  avoiding: 'Name the thing you do not want to deal with.',
};
function defaultDailyFocus(dayKey) {
  return {
    dayKey,
    mainMissionId: '', mainMissionText: DEFAULT_SLOT_TEXT.mainMissionText, mainDone: false,
    bodyWin: DEFAULT_SLOT_TEXT.bodyWin, bodyDone: false,
    lifeWinId: '', lifeWinText: DEFAULT_SLOT_TEXT.lifeWinText, lifeDone: false,
    avoiding: DEFAULT_SLOT_TEXT.avoiding, avoidingDone: false,
    updatedAt: new Date().toISOString(),
  };
}
function dbToDailyFocus(row) {
  return {
    dayKey: row.day_key,
    mainMissionId: row.main_mission_id || '',
    mainMissionText: row.main_mission_text || DEFAULT_SLOT_TEXT.mainMissionText,
    mainDone: row.main_done || false,
    bodyWin: row.body_win || DEFAULT_SLOT_TEXT.bodyWin,
    bodyDone: row.body_done || false,
    lifeWinId: row.life_win_id || '',
    lifeWinText: row.life_win_text || DEFAULT_SLOT_TEXT.lifeWinText,
    lifeDone: row.life_done || false,
    avoiding: row.avoiding || DEFAULT_SLOT_TEXT.avoiding,
    avoidingDone: row.avoiding_done || false,
    updatedAt: row.updated_at,
  };
}
function dailyFocusToDb(dayKey, t) {
  return {
    day_key: dayKey,
    main_mission_id: t.mainMissionId || '',
    main_mission_text: t.mainMissionText || '',
    main_done: t.mainDone || false,
    body_win: t.bodyWin || '',
    body_done: t.bodyDone || false,
    life_win_id: t.lifeWinId || '',
    life_win_text: t.lifeWinText || '',
    life_done: t.lifeDone || false,
    avoiding: t.avoiding || '',
    avoiding_done: t.avoidingDone || false,
    updated_at: t.updatedAt || new Date().toISOString(),
  };
}
function dbToMilestone(row) {
  return {
    id: row.id, missionId: row.mission_id, weekStart: row.week_start,
    title: row.title, done: row.done || false, createdAt: row.created_at,
  };
}
function milestoneToDb(m) {
  return {
    id: m.id, mission_id: m.missionId, week_start: m.weekStart,
    title: m.title, done: m.done || false, created_at: m.createdAt,
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
      <span className="daily-quote-mark">"</span>
      <div className="daily-quote-body">
        <p className="daily-quote-text">{quote.text}</p>
        <p className="daily-quote-author">— {quote.author}</p>
      </div>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────
function App() {
  const [thoughts, setThoughts] = useState([]);
  const [missions, setMissions] = useState([]);
  const [today, setToday] = useState(null);
  const [yesterdayFocus, setYesterdayFocus] = useState(null);
  const [todayKey] = useState(() => getLocalTodayKey());
  const [reviews, setReviews] = useState([]);
  const [milestones, setMilestones] = useState([]);
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
  const [pendingExecuteSlot, setPendingExecuteSlot] = useState(null);
  const [nextTaskPrompt, setNextTaskPrompt] = useState(null);
  const [executeSession, setExecuteSession] = useState(() => {
    try {
      const raw = localStorage.getItem('blakeos-execute-session');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  });

  useEffect(() => {
    if (executeSession) localStorage.setItem('blakeos-execute-session', JSON.stringify(executeSession));
    else localStorage.removeItem('blakeos-execute-session');
  }, [executeSession]);

  function savePinnedGoals(ids) {
    setPinnedGoalIds(ids);
    localStorage.setItem('blakeos-pinned-goals', JSON.stringify(ids));
  }

  // ── Load all data from Supabase on mount ──
  useEffect(() => {
    async function loadAll() {
      const yesterdayKey = addDaysToKey(todayKey, -1);
      const [thoughtsRes, missionsRes, focusRes, reviewsRes, milestonesRes] = await Promise.all([
        supabase.from('thoughts').select('*').order('created_at', { ascending: false }),
        supabase.from('missions').select('*').order('created_at', { ascending: false }),
        supabase.from('daily_focus').select('*').in('day_key', [todayKey, yesterdayKey]),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('milestones').select('*').order('week_start', { ascending: true }),
      ]);
      if (thoughtsRes.data) setThoughts(thoughtsRes.data.map(dbToThought));
      if (missionsRes.data) setMissions(missionsRes.data.map(dbToMission));
      const focusRows = focusRes.data || [];
      const todayRow = focusRows.find((r) => r.day_key === todayKey);
      const yesterdayRow = focusRows.find((r) => r.day_key === yesterdayKey);
      setToday(todayRow ? dbToDailyFocus(todayRow) : defaultDailyFocus(todayKey));
      setYesterdayFocus(yesterdayRow ? dbToDailyFocus(yesterdayRow) : null);
      if (reviewsRes.data) setReviews(reviewsRes.data.map(dbToReview));
      if (milestonesRes.data) setMilestones(milestonesRes.data.map(dbToMilestone));
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

  // ── Today (day-keyed) ──
  const TEXT_TO_DONE_KEY = { mainMissionText: 'mainDone', bodyWin: 'bodyDone', lifeWinText: 'lifeDone', avoiding: 'avoidingDone' };

  async function patchToday(patch) {
    const merged = { ...today, ...patch, updatedAt: new Date().toISOString() };
    // Fresh non-empty text on a slot implies a new commitment — reset its done flag,
    // unless the caller explicitly included that done flag in this same patch.
    Object.entries(patch).forEach(([key, value]) => {
      const doneKey = TEXT_TO_DONE_KEY[key];
      if (doneKey && value && value.trim() && !(doneKey in patch)) merged[doneKey] = false;
    });
    setToday(merged);
    await supabase.from('daily_focus').upsert(dailyFocusToDb(todayKey, merged), { onConflict: 'day_key' });
  }

  async function updateToday(key, value) {
    await patchToday({ [key]: value });
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
      prioritySignals: [],
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

  // ── Milestones ──
  async function setMilestone(missionId, weekStart, title) {
    const existing = milestones.find((m) => m.missionId === missionId && m.weekStart === weekStart);
    const trimmed = title.trim();
    if (existing && !trimmed) {
      setMilestones((prev) => prev.filter((m) => m.id !== existing.id));
      await supabase.from('milestones').delete().eq('id', existing.id);
      return;
    }
    if (!trimmed) return;
    if (existing) {
      setMilestones((prev) => prev.map((m) => m.id === existing.id ? { ...m, title: trimmed } : m));
      await supabase.from('milestones').update({ title: trimmed }).eq('id', existing.id);
    } else {
      const row = { id: crypto.randomUUID(), missionId, weekStart, title: trimmed, done: false, createdAt: new Date().toISOString() };
      setMilestones((prev) => [...prev, row]);
      await supabase.from('milestones').insert(milestoneToDb(row));
    }
  }

  async function toggleMilestone(id, done) {
    setMilestones((prev) => prev.map((m) => m.id === id ? { ...m, done } : m));
    await supabase.from('milestones').update({ done }).eq('id', id);
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
    const patch = { [valueKey]: text.trim() };
    if (idKeyMap[slot]) patch[idKeyMap[slot]] = id;
    patchToday(patch);
  }

  function completeSlot(slot, linkedId) {
    const keyMap = { main: 'mainMissionText', body: 'bodyWin', life: 'lifeWinText', avoiding: 'avoiding' };
    const idKeyMap = { main: 'mainMissionId', life: 'lifeWinId' };
    const doneKeyMap = { main: 'mainDone', body: 'bodyDone', life: 'lifeDone', avoiding: 'avoidingDone' };
    const valueKey = keyMap[slot];
    if (!valueKey) return;
    if (linkedId) updateThought(linkedId, { status: 'Done' });
    const patch = { [valueKey]: '', [doneKeyMap[slot]]: true };
    if (idKeyMap[slot]) patch[idKeyMap[slot]] = '';
    patchToday(patch);
  }

  // ── Commitment Pressure — clear a carried-over item from yesterday ──
  async function clearYesterdayCommitment(slot, linkedId) {
    if (!yesterdayFocus) return;
    const doneKeyMap = { main: 'mainDone', body: 'bodyDone', life: 'lifeDone', avoiding: 'avoidingDone' };
    const doneKey = doneKeyMap[slot];
    if (!doneKey) return;
    if (linkedId) updateThought(linkedId, { status: 'Done' });
    const merged = { ...yesterdayFocus, [doneKey]: true };
    setYesterdayFocus(merged);
    await supabase.from('daily_focus').update({ [doneKey === 'mainDone' ? 'main_done' : doneKey === 'bodyDone' ? 'body_done' : doneKey === 'lifeDone' ? 'life_done' : 'avoiding_done']: true }).eq('day_key', yesterdayFocus.dayKey);
  }

  // ── Tomorrow Preload ──
  async function saveTomorrowPreload(fields) {
    const tomorrowKey = addDaysToKey(todayKey, 1);
    const row = {
      dayKey: tomorrowKey,
      mainMissionId: '', mainMissionText: fields.mainMissionText || DEFAULT_SLOT_TEXT.mainMissionText, mainDone: false,
      bodyWin: fields.bodyWin || DEFAULT_SLOT_TEXT.bodyWin, bodyDone: false,
      lifeWinId: '', lifeWinText: fields.lifeWinText || DEFAULT_SLOT_TEXT.lifeWinText, lifeDone: false,
      avoiding: fields.avoiding || DEFAULT_SLOT_TEXT.avoiding, avoidingDone: false,
      updatedAt: new Date().toISOString(),
    };
    await supabase.from('daily_focus').upsert(dailyFocusToDb(tomorrowKey, row), { onConflict: 'day_key' });
  }

  // ── Execute Mode ──
  function getExecuteContext(linkedId) {
    if (!linkedId) return { supports: null, energy: null, why: null };
    const t = thoughts.find((x) => x.id === linkedId);
    if (!t) return { supports: null, energy: null, why: null };
    const mission = t.relatedMissionId ? missions.find((m) => m.id === t.relatedMissionId) : null;
    return { supports: mission ? mission.title : t.area, energy: t.energy || null, why: t.notes || t.nextAction || null };
  }

  function startExecuteSession(slotId, durationSec) {
    const linkedIdMap = { main: today.mainMissionId, life: today.lifeWinId };
    const textMap = { main: today.mainMissionText, body: today.bodyWin, life: today.lifeWinText, avoiding: today.avoiding };
    setExecuteSession({
      slotId, taskText: textMap[slotId], linkedId: linkedIdMap[slotId] || '',
      durationSec, status: 'running',
      endAt: new Date(Date.now() + durationSec * 1000).toISOString(),
      pausedRemainingSec: null,
    });
    setPendingExecuteSlot(null);
    setNextTaskPrompt(null);
  }

  function pauseExecuteSession() {
    setExecuteSession((s) => {
      if (!s || s.status !== 'running') return s;
      const remaining = Math.max(0, Math.round((new Date(s.endAt).getTime() - Date.now()) / 1000));
      return { ...s, status: 'paused', pausedRemainingSec: remaining, endAt: null };
    });
  }

  function resumeExecuteSession() {
    setExecuteSession((s) => {
      if (!s || s.status !== 'paused') return s;
      return { ...s, status: 'running', endAt: new Date(Date.now() + (s.pausedRemainingSec || 0) * 1000).toISOString(), pausedRemainingSec: null };
    });
  }

  function adjustExecuteSession(deltaSec) {
    setExecuteSession((s) => {
      if (!s) return s;
      if (s.status === 'running') {
        const newEnd = new Date(Math.max(Date.now(), new Date(s.endAt).getTime() + deltaSec * 1000));
        return { ...s, endAt: newEnd.toISOString() };
      }
      if (s.status === 'paused') {
        return { ...s, pausedRemainingSec: Math.max(0, (s.pausedRemainingSec || 0) + deltaSec) };
      }
      return s;
    });
  }

  function markExecuteExpired() {
    setExecuteSession((s) => (s && s.status === 'running' ? { ...s, status: 'awaiting-outcome', endAt: null } : s));
  }

  function exitExecuteSession() {
    setExecuteSession(null);
    setPendingExecuteSlot(null);
    setNextTaskPrompt(null);
  }

  function finishExecuteOutcome(outcome) {
    if (!executeSession) return;
    if (outcome === 'finished') {
      completeSlot(executeSession.slotId, executeSession.linkedId);
      setNextTaskPrompt({ finishedSlotId: executeSession.slotId });
    }
    setExecuteSession(null);
  }

  function goToCategory(catId) {
    setSelectedCategory(catId);
    setActiveTab('sort');
  }

  const navItems = [
    { id: 'today',    label: 'Today',    icon: Home,       color: 'nav-amber'  },
    { id: 'capture',  label: 'Capture',  icon: Plus,       color: 'nav-gray'   },
    { id: 'sort',     label: 'Command',  icon: Layers,     color: 'nav-purple' },
    { id: 'plan',     label: 'Plan',     icon: CalendarDays, color: 'nav-orange' },
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
            goToGoal={(id) => { setHighlightGoalId(id); setActiveTab('plan'); }}
            onManageGoals={() => setModal({ type: 'manage-goals' })}
            yesterdayFocus={yesterdayFocus}
            clearYesterdayCommitment={clearYesterdayCommitment}
            onExecute={(slotId) => setPendingExecuteSlot(slotId)}
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
        {activeTab === 'plan' && (
          <PlanView
            openTasks={openTasks} openLoops={openLoops}
            missions={missions} milestones={milestones} today={today}
            updateThought={updateThought} updateMission={updateMission}
            setMilestone={setMilestone} toggleMilestone={toggleMilestone}
            setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
            promoteToToday={promoteToToday}
            highlightGoalId={highlightGoalId} setHighlightGoalId={setHighlightGoalId}
            setModal={setModal}
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
            saveTomorrowPreload={saveTomorrowPreload}
          />
        </Modal>
      )}
      {modal?.type === 'goal-form' && (
        <Modal title={modal.mission ? 'Edit Goal' : 'New Goal'} onClose={() => setModal(null)}>
          <GoalFormModal
            mission={modal.mission}
            addMission={addMission} updateMission={updateMission} deleteMission={deleteMission}
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

      {pendingExecuteSlot && !executeSession && today && (
        <ExecuteTimeSelect
          slotId={pendingExecuteSlot}
          taskText={{ main: today.mainMissionText, body: today.bodyWin, life: today.lifeWinText, avoiding: today.avoiding }[pendingExecuteSlot]}
          onCancel={() => setPendingExecuteSlot(null)}
          onStart={(durationSec) => startExecuteSession(pendingExecuteSlot, durationSec)}
        />
      )}
      {executeSession && (
        <ExecuteRunning
          session={executeSession}
          context={getExecuteContext(executeSession.linkedId)}
          onPause={pauseExecuteSession}
          onResume={resumeExecuteSession}
          onAdjust={adjustExecuteSession}
          onExpire={markExecuteExpired}
          onExit={exitExecuteSession}
          onOutcome={finishExecuteOutcome}
        />
      )}
      {nextTaskPrompt && !executeSession && !pendingExecuteSlot && today && (
        <ExecuteNextTask
          finishedSlotId={nextTaskPrompt.finishedSlotId}
          today={today}
          onPick={(slotId) => setPendingExecuteSlot(slotId)}
          onExit={() => setNextTaskPrompt(null)}
        />
      )}
    </div>
  );
}

// ─── Today View ────────────────────────────────────────────────────────────
function TodayView({ today, updateToday, missions, allMissions, openTasks, openLoops, noiseItems, activeThoughts, doneThoughts, energyFilter, setEnergyFilter, energyFilteredTasks, setActiveTab, setSelectedCategory, setModal, updateThought, promoteToToday, completeSlot, goToGoal, onManageGoals, yesterdayFocus, clearYesterdayCommitment, onExecute }) {
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
      onExecute: () => onExecute('main'),
    },
    {
      id: 'body', number: '02', label: 'Energy', subtitle: 'Body, recovery, stability, and fuel',
      tone: 'orange', icon: Activity, value: today.bodyWin,
      fallback: defaultSlots.bodyWin, linkedId: '',
      onChange: (v) => updateToday('bodyWin', v),
      onPromote: () => setModal({ type: 'promote', slot: 'body', modeLabel: 'Energy' }),
      onComplete: () => completeSlot('body', ''),
      onExecute: () => onExecute('body'),
    },
    {
      id: 'life', number: '03', label: 'Growth', subtitle: 'Learning, reflection, and future progress',
      tone: 'amber', icon: Layers, value: today.lifeWinText,
      fallback: defaultSlots.lifeWinText, linkedId: today.lifeWinId,
      onChange: (v) => updateToday('lifeWinText', v),
      onPromote: () => setModal({ type: 'promote', slot: 'life', modeLabel: 'Growth' }),
      onComplete: () => completeSlot('life', today.lifeWinId),
      onExecute: () => onExecute('life'),
    },
    {
      id: 'avoiding', number: '04', label: 'Execution', subtitle: 'Ship, close, respond, and move forward',
      tone: 'blue', icon: Zap, value: today.avoiding,
      fallback: defaultSlots.avoiding, linkedId: '',
      onChange: (v) => updateToday('avoiding', v),
      onPromote: () => setModal({ type: 'promote', slot: 'avoiding', modeLabel: 'Execution' }),
      onComplete: () => completeSlot('avoiding', ''),
      onExecute: () => onExecute('avoiding'),
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

      <CommitmentPressure yesterdayFocus={yesterdayFocus} clearYesterdayCommitment={clearYesterdayCommitment} />

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
              onExecute={slot.onExecute}
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
    { label: 'Set',     value: `${slotsSet}/4`, tone: 'amber' },
    { label: 'Actions', value: openTasks,       tone: 'green' },
    { label: 'Cleared', value: clearedToday,    tone: 'blue' },
    { label: 'Noise',   value: noiseCount,      tone: 'red' },
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
            <div key={m.label} className={`command-metric-tile command-metric-${m.tone}`}>
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
      <button className="command-strip-item command-strip-btn strip-blue" onClick={() => goTo('plan')}><Target size={15} /><span>{missions} goal{missions === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-green" onClick={() => goTo('sort', 'next-actions')}><CheckCircle2 size={15} /><span>{actions} action{actions === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-orange" onClick={() => goTo('sort', 'problems')}><AlertCircle size={15} /><span>{loops} loop{loops === 1 ? '' : 's'}</span></button>
      <button className="command-strip-item command-strip-btn strip-red" onClick={() => goTo('sort', 'anxiety-noise')}><Brain size={15} /><span>{noise} noise</span></button>
      <div className={`command-strip-item command-strip-load ${loadColor}`}><Zap size={15} /><span>{load} load</span></div>
    </div>
  );
}

function TodaySlot({ number, label, subtitle, value, fallback, tone, icon: Icon, onChange, onPromote, onComplete, onExecute, linkedId, isSet }) {
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
        <button className="promote-btn today-command-execute" onClick={onExecute} disabled={!isSet} title={isSet ? 'Start a focused session' : 'Set this card first'}>
          <Flame size={14} /> Execute
        </button>
      </div>
    </div>
  );
}

// ─── Commitment Pressure — unfinished commitments from yesterday ──────────
function CommitmentPressure({ yesterdayFocus, clearYesterdayCommitment }) {
  if (!yesterdayFocus) return null;
  const isMeaningful = (value, fallback) => Boolean(value && value.trim() && value.trim() !== fallback);
  const carryover = Object.entries(SLOT_META)
    .map(([slotId, meta]) => ({
      slotId, meta,
      text: yesterdayFocus[meta.textKey],
      done: yesterdayFocus[meta.doneKey],
      linkedId: meta.idKey ? yesterdayFocus[meta.idKey] : '',
    }))
    .filter((row) => isMeaningful(row.text, DEFAULT_SLOT_TEXT[row.meta.textKey]) && !row.done);

  if (carryover.length === 0) {
    return (
      <div className="commitment-pressure commitment-clean">
        <CheckCircle2 size={16} />
        <div>
          <strong>No carryover commitments.</strong>
          <p>Today's slate is clean.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="commitment-pressure commitment-open">
      <div className="commitment-header">
        <AlertCircle size={16} />
        <strong>Carryover Commitments</strong>
      </div>
      <p className="commitment-sub">Yesterday you committed to:</p>
      <div className="commitment-list">
        {carryover.map((row) => (
          <div key={row.slotId} className="commitment-item">
            <Pill tone={row.meta.tone}>{row.meta.label}</Pill>
            <span className="commitment-text">{row.text}</span>
            <button className="commitment-clear-btn" onClick={() => clearYesterdayCommitment(row.slotId, row.linkedId)} title="Mark done">
              <Check size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Execute Mode ───────────────────────────────────────────────────────────
const EXECUTE_DURATIONS = [15, 25, 45, 60];

function ExecuteTimeSelect({ slotId, taskText, onCancel, onStart }) {
  const [custom, setCustom] = useState('');
  const meta = SLOT_META[slotId];
  return (
    <div className="execute-overlay">
      <button className="execute-close" onClick={onCancel}><X size={22} /></button>
      <div className="execute-select-body">
        <Pill tone={meta.tone}><meta.icon size={13} /> {meta.label}</Pill>
        <h2 className="execute-select-title">{taskText}</h2>
        <p className="execute-select-sub">Choose Session Length</p>
        <div className="execute-duration-grid">
          {EXECUTE_DURATIONS.map((min) => (
            <button key={min} className="execute-duration-btn" onClick={() => onStart(min * 60)}>{min}</button>
          ))}
        </div>
        <div className="execute-custom-row">
          <input
            type="number" min="1" placeholder="Custom minutes"
            value={custom} onChange={(e) => setCustom(e.target.value)}
          />
          <button
            className="primary-button compact"
            disabled={!custom || Number(custom) <= 0}
            onClick={() => onStart(Number(custom) * 60)}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}

function ExecuteRunning({ session, context, onPause, onResume, onAdjust, onExpire, onExit, onOutcome }) {
  const [remaining, setRemaining] = useState(0);
  const meta = SLOT_META[session.slotId];

  useEffect(() => {
    function tick() {
      if (session.status === 'paused') { setRemaining(session.pausedRemainingSec || 0); return; }
      if (session.status === 'awaiting-outcome') { setRemaining(0); return; }
      const secs = Math.max(0, Math.round((new Date(session.endAt).getTime() - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) onExpire();
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.status, session.endAt, session.pausedRemainingSec]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="execute-overlay">
      <button className="execute-close" onClick={onExit}><X size={22} /></button>

      {session.status !== 'awaiting-outcome' ? (
        <div className="execute-running-body">
          <div className="execute-timer">{mm}:{ss}</div>
          <Pill tone={meta.tone}><meta.icon size={13} /> {meta.label}</Pill>
          <h2 className="execute-task-title">{session.taskText}</h2>

          {(context.supports || context.energy || context.why) && (
            <div className="execute-context">
              {context.supports && (
                <div className="execute-context-row"><span className="execute-context-label">Supports</span><span>{context.supports}</span></div>
              )}
              {context.energy && (
                <div className="execute-context-row"><span className="execute-context-label">Energy</span><span>{context.energy}</span></div>
              )}
              {context.why && (
                <div className="execute-context-row"><span className="execute-context-label">Why</span><span>{context.why}</span></div>
              )}
            </div>
          )}

          <div className="execute-adjust-row">
            <button className="execute-adjust-btn" onClick={() => onAdjust(-300)}>-5</button>
            <button className="execute-pause-btn" onClick={session.status === 'running' ? onPause : onResume}>
              {session.status === 'running' ? 'Pause' : 'Resume'}
            </button>
            <button className="execute-adjust-btn" onClick={() => onAdjust(300)}>+5</button>
          </div>
        </div>
      ) : (
        <div className="execute-complete-body">
          <h2 className="execute-complete-title">Session Complete</h2>
          <p className="execute-complete-sub">How'd it go?</p>
          <div className="execute-outcome-list">
            <button className="execute-outcome-btn outcome-finished" onClick={() => onOutcome('finished')}>Finished</button>
            <button className="execute-outcome-btn outcome-progress" onClick={() => onOutcome('progress')}>Made Progress</button>
            <button className="execute-outcome-btn outcome-notfinished" onClick={() => onOutcome('not-finished')}>Didn't Finish</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExecuteNextTask({ finishedSlotId, today, onPick, onExit }) {
  const isMeaningful = (value, fallback) => Boolean(value && value.trim() && value.trim() !== fallback);
  const candidates = Object.entries(SLOT_META)
    .filter(([slotId, meta]) => slotId !== finishedSlotId && isMeaningful(today[meta.textKey], DEFAULT_SLOT_TEXT[meta.textKey]) && !today[meta.doneKey])
    .map(([slotId, meta]) => ({ slotId, meta, text: today[meta.textKey] }));

  return (
    <div className="execute-overlay">
      <button className="execute-close" onClick={onExit}><X size={22} /></button>
      <div className="execute-next-body">
        <h2 className="execute-complete-title">What next?</h2>
        {candidates.length > 0 ? (
          <div className="execute-next-list">
            {candidates.map((row) => (
              <button key={row.slotId} className="execute-next-item" onClick={() => onPick(row.slotId)}>
                <Pill tone={row.meta.tone}><row.meta.icon size={13} /> {row.meta.label}</Pill>
                <span>{row.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="execute-next-empty">Nothing else set for today. Clean slate.</p>
        )}
        <button className="secondary-button full-width" onClick={onExit}>Exit</button>
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

function CloseDayModal({ thoughts, missions, onClose, saveTomorrowPreload }) {
  const [step, setStep] = useState('gut'); // 'gut' | 'questions' | 'summary' | 'preload'
  const [gutCall, setGutCall] = useState('');
  const [answers, setAnswers] = useState({});
  const [copied, setCopied] = useState(false);
  const [preload, setPreload] = useState({ mainMissionText: '', bodyWin: '', lifeWinText: '', avoiding: '' });
  const [preloadSaved, setPreloadSaved] = useState(false);

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

  function setPreloadField(key, value) {
    setPreload((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveTomorrow() {
    saveTomorrowPreload(preload);
    setPreloadSaved(true);
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
          <button className="secondary-button full-width" onClick={() => setStep('preload')}>
            <ArrowRight size={16} /> Plan Tomorrow
          </button>
        </div>
      )}

      {step === 'preload' && (
        <div className="closeday-step">
          <p className="closeday-subtitle">Fill tomorrow's 4 cards now. No auto-fill — pick with intention.</p>
          <div className="preload-grid">
            {Object.entries(SLOT_META).map(([slotId, meta]) => (
              <div key={slotId} className={`preload-field preload-field-${meta.tone}`}>
                <div className="preload-field-label"><meta.icon size={14} /> {meta.label}</div>
                <textarea
                  value={preload[meta.textKey]}
                  placeholder={`Tomorrow's ${meta.label.toLowerCase()}...`}
                  onChange={(e) => setPreloadField(meta.textKey, e.target.value)}
                />
              </div>
            ))}
          </div>
          <button className="primary-button" onClick={handleSaveTomorrow} disabled={preloadSaved}>
            {preloadSaved ? <><Check size={17} /> Tomorrow Saved</> : <><Save size={17} /> Save Tomorrow</>}
          </button>
          {preloadSaved && (
            <button className="secondary-button full-width" onClick={onClose}>Done</button>
          )}
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
      {thought.category === 'active-missions' && thought.prioritySignals && thought.prioritySignals.length > 0 && (
        <div className="mission-signal-row">
          {thought.prioritySignals.map((sid) => {
            const s = PRIORITY_SIGNALS.find((x) => x.id === sid);
            if (!s) return null;
            return <Pill key={sid} tone={s.tone}>{s.icon} {s.label}</Pill>;
          })}
        </div>
      )}
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
  const [form, setForm] = useState({ ...thought, prioritySignals: thought.prioritySignals || [] });
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function toggleSignal(id) {
    setForm((prev) => {
      const has = prev.prioritySignals.includes(id);
      return { ...prev, prioritySignals: has ? prev.prioritySignals.filter((x) => x !== id) : [...prev.prioritySignals, id] };
    });
  }
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
      {form.category === 'active-missions' && (
        <div className="field">
          <span>Priority Signal <span style={{ fontWeight: 400, opacity: 0.5 }}>(select any that apply)</span></span>
          <div className="goal-signal-toggles">
            {PRIORITY_SIGNALS.map((s) => {
              const active = form.prioritySignals.includes(s.id);
              return (
                <button key={s.id} type="button" className={`goal-signal-toggle ${active ? `signal-active-${s.tone}` : 'signal-inactive'}`} onClick={() => toggleSignal(s.id)}>
                  {s.icon} {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
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

function ProgressView({ doneThoughts, activeThoughts, reviews, saveReview, subTab, setSubTab, goToCategory, updateThought, setModal }) {
  return (
    <section className="screen stack">
      <div className="section-header"><div><p className="eyebrow">BlakeOS</p><h2>Progress</h2></div></div>
      <div className="subtab-row">
        <button className={`subtab-btn ${subTab === 'accomplishments' ? 'active' : ''}`} onClick={() => setSubTab('accomplishments')}><Trophy size={15} /> Accomplishments</button>
        <button className={`subtab-btn ${subTab === 'review' ? 'active' : ''}`} onClick={() => setSubTab('review')}><RefreshCw size={15} /> Weekly Review</button>
      </div>
      {subTab === 'accomplishments' && <AccomplishmentsTab doneThoughts={doneThoughts} updateThought={updateThought} setModal={setModal} />}
      {subTab === 'review' && <ReviewTab activeThoughts={activeThoughts} doneThoughts={doneThoughts} reviews={reviews} saveReview={saveReview} goToCategory={goToCategory} />}
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

  // Days collapsed by default; user can expand
  const [expandedDays, setExpandedDays] = useState({});
  function toggleDay(key) { setExpandedDays((prev) => ({ ...prev, [key]: !prev[key] })); }

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
        <div className="hero-stat-row">
          <div className="accomplish-stat identity-stat identity-stat--fire">
            <div className="identity-stat-icon identity-stat-icon--fire"><Flame size={22} /></div>
            <div className="identity-stat-body">
              <strong>{previousDayCount}</strong>
              <span>Yesterday</span>
            </div>
          </div>
          <div className="accomplish-stat identity-stat identity-stat--calendar">
            <div className="identity-stat-icon identity-stat-icon--calendar"><CalendarDays size={22} /></div>
            <div className="identity-stat-body">
              <strong>{thisWeekCount}</strong>
              <span>This Week</span>
            </div>
          </div>
          <div className="accomplish-stat identity-stat identity-stat--target">
            <div className="identity-stat-icon identity-stat-icon--target"><Target size={22} /></div>
            <div className="identity-stat-body">
              <strong>{doneThoughts.length}</strong>
              <span>Total</span>
            </div>
          </div>
          <div className="accomplish-stat identity-stat identity-stat--green">
            <div className="identity-stat-icon identity-stat-icon--green"><Star size={22} /></div>
            <div className="identity-stat-body">
              <strong>{proofDays}</strong>
              <span>Days Strong</span>
            </div>
          </div>
        </div>
      </div>

      <div className="evidence-section-header">
        <div><p className="eyebrow">Your Track Record</p><h2>Day by Day</h2><p className="muted">Every completed item, organized by the day you closed it.</p></div>
      </div>

      {byDay.map(([dayKey, items]) => {
        const byCat = {};
        const isExpanded = expandedDays[dayKey];
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
              {isExpanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
            </button>
            {isExpanded && (
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

function ReviewTab({ activeThoughts, doneThoughts, reviews, saveReview, goToCategory }) {
  const [review, setReview] = useState({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' });
  function set(key, value) { setReview((prev) => ({ ...prev, [key]: value })); }
  function submit(e) { e.preventDefault(); saveReview(review); setReview({ improved: '', avoided: '', mattered: '', stress: '', nextWeek: '' }); }
  const weekCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const counts = categories.map((c) => ({
    ...c,
    count: activeThoughts.filter((t) => t.category === c.id).length,
    staleCount: activeThoughts.filter((t) => t.category === c.id && stalenessLabel(getDaysOld(t.createdAt), c.id)?.urgent).length,
    closedCount: doneThoughts.filter((t) => t.category === c.id && new Date(t.completedAt || t.createdAt).getTime() >= weekCutoff).length,
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
                <div className="stat-closed-row"><CheckCircle2 size={11} /><span>{item.closedCount} closed this wk</span></div>
              </button>
            );
          })}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>Tap any category to jump to it in Sort. Closed counts items completed in the last 7 days.</p>
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

// ─── Plan View — Triage Layer + Agenda Rail + Mission Control ──────────────
function PlanView({ openTasks, openLoops, missions, milestones, today, updateThought, updateMission, setMilestone, toggleMilestone, setActiveTab, setSelectedCategory, promoteToToday, highlightGoalId, setHighlightGoalId, setModal }) {
  const [subTab, setSubTab] = useState('week');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [triage, setTriage] = useState(null);
  const [triageLoading, setTriageLoading] = useState(false);
  const [triageError, setTriageError] = useState('');
  const [appliedIds, setAppliedIds] = useState([]);

  const todayKey = getLocalTodayKey();
  const allPlanItems = useMemo(() => [...openTasks, ...openLoops], [openTasks, openLoops]);
  const itemById = useMemo(() => {
    const map = {};
    allPlanItems.forEach((t) => { map[t.id] = t; });
    return map;
  }, [allPlanItems]);

  // Triage annotations, keyed by item id — session-only, never persisted
  const rankById = useMemo(() => {
    const map = {};
    (triage?.top3 || []).forEach((entry, i) => { map[entry.id] = { rank: i + 1, reason: entry.reason || '' }; });
    return map;
  }, [triage]);
  const blockerById = useMemo(() => {
    const map = {};
    (triage?.blockers || []).forEach((entry) => { map[entry.id] = entry.note || ''; });
    return map;
  }, [triage]);

  // Jump from Today's goal links straight into that goal's war room
  useEffect(() => {
    if (highlightGoalId) {
      setSelectedGoalId(highlightGoalId);
      setSubTab('roadmap');
      setHighlightGoalId('');
    }
  }, [highlightGoalId, setHighlightGoalId]);

  useEffect(() => {
    if (!selectedGoalId && missions.length) setSelectedGoalId(missions[0].id);
  }, [missions, selectedGoalId]);

  async function runTriage() {
    setTriageLoading(true);
    setTriageError('');
    setAppliedIds([]);
    try {
      const payload = {
        todayKey,
        focus: today ? { main: today.mainMissionText, avoiding: today.avoiding } : null,
        missions: missions.map((m) => ({
          id: m.id, title: m.title, area: m.area, status: m.status,
          targetDate: m.targetDate || null, weeklyGoal: m.weeklyGoal || '',
        })),
        items: allPlanItems.map((t) => ({
          id: t.id, text: t.text, category: t.category, area: t.area,
          energy: t.energy, dueDate: t.dueDate || null, status: t.status,
          daysOld: getDaysOld(t.createdAt), missionId: t.relatedMissionId || null,
          nextAction: t.nextAction || '', waitingOn: t.waitingOn || '',
        })),
      };
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Triage failed (${res.status})`);
      setTriage(data);
    } catch (err) {
      setTriageError(err.message || 'Triage failed');
    }
    setTriageLoading(false);
  }

  function applyDate(id, date) {
    updateThought(id, { dueDate: date });
    setAppliedIds((prev) => [...prev, id]);
  }

  return (
    <div className="stack">
      <TriagePanel
        triage={triage} loading={triageLoading} error={triageError}
        runTriage={runTriage} itemById={itemById} todayKey={todayKey}
        appliedIds={appliedIds} applyDate={applyDate}
      />
      <div className="subtab-row">
        <button className={`subtab-btn ${subTab === 'week' ? 'active' : ''}`} onClick={() => setSubTab('week')}><CalendarDays size={15} /> This Week</button>
        <button className={`subtab-btn ${subTab === 'roadmap' ? 'active' : ''}`} onClick={() => setSubTab('roadmap')}><Flag size={15} /> Roadmap</button>
      </div>
      {subTab === 'week' && (
        <WeekView
          items={allPlanItems} openTasks={openTasks} todayKey={todayKey}
          updateThought={updateThought} promoteToToday={promoteToToday}
          rankById={rankById} blockerById={blockerById}
          setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
        />
      )}
      {subTab === 'roadmap' && (
        <RoadmapView
          missions={missions} items={allPlanItems} milestones={milestones} todayKey={todayKey}
          updateMission={updateMission} updateThought={updateThought}
          setMilestone={setMilestone} toggleMilestone={toggleMilestone}
          rankById={rankById} blockerById={blockerById}
          selectedGoalId={selectedGoalId} setSelectedGoalId={setSelectedGoalId}
          setModal={setModal}
          setActiveTab={setActiveTab} setSelectedCategory={setSelectedCategory}
        />
      )}
    </div>
  );
}

function TriagePanel({ triage, loading, error, runTriage, itemById, todayKey, appliedIds, applyDate }) {
  return (
    <div className="card triage-card">
      <div className="mini-header triage-header">
        <div className="triage-title"><Sparkles size={18} /><h3>Claude Triage</h3></div>
        <button className="primary-button compact" onClick={runTriage} disabled={loading}>
          {loading ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
          <span>{loading ? 'Reading the board…' : triage ? 'Re-run' : 'Run Triage'}</span>
        </button>
      </div>
      {!triage && !loading && !error && (
        <p className="muted small">Claude reads every open item, then marks the board below: top 3 ranked, blockers flagged, dates proposed. Nothing is saved until you approve it.</p>
      )}
      {error && (
        <div className="triage-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {triage && !loading && (
        <div className="triage-result">
          {triage.headline && <p className="triage-headline">{triage.headline}</p>}
          <p className="muted small">Top 3 and blockers are marked directly on the board below.</p>

          {Array.isArray(triage.schedule) && triage.schedule.length > 0 && (
            <div className="triage-section">
              <p className="triage-section-label"><CalendarDays size={14} /> Proposed dates</p>
              {triage.schedule.map((entry) => {
                const item = itemById[entry.id];
                if (!item || !entry.date) return null;
                const applied = appliedIds.includes(entry.id);
                return (
                  <div key={entry.id} className="triage-item">
                    <div className="triage-item-body">
                      <span>{item.text}</span>
                      <p className="triage-reason">{dayShortLabel(entry.date, todayKey)}{entry.reason ? ` — ${entry.reason}` : ''}</p>
                    </div>
                    <button
                      className={`triage-apply-btn ${applied ? 'applied' : ''}`}
                      onClick={() => applyDate(entry.id, entry.date)}
                      disabled={applied}
                    >
                      {applied ? <Check size={14} /> : <Plus size={14} />}
                      {applied ? 'Set' : 'Apply'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {Array.isArray(triage.warnings) && triage.warnings.length > 0 && (
            <div className="triage-section">
              {triage.warnings.map((w, i) => (
                <p key={i} className="triage-warning"><AlertCircle size={13} /> {w}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DateChips({ item, todayKey, updateThought }) {
  const inputRef = React.useRef(null);
  return (
    <div className="date-chip-group">
      <span className="date-chip-label">Reschedule</span>
      <div className="date-chip-row">
        <button className="date-chip" onClick={() => updateThought(item.id, { dueDate: todayKey })}>Today</button>
        <button className="date-chip" onClick={() => updateThought(item.id, { dueDate: addDaysToKey(todayKey, 1) })}>Tmr</button>
        <button className="date-chip date-chip-calendar" onClick={() => inputRef.current?.showPicker ? inputRef.current.showPicker() : inputRef.current?.focus()}>
          <CalendarDays size={13} />
        </button>
        <input
          ref={inputRef}
          type="date" className="date-chip-input-hidden" value={item.dueDate || ''}
          onChange={(e) => updateThought(item.id, { dueDate: e.target.value })}
        />
      </div>
    </div>
  );
}

function PlanTask({ item, todayKey, updateThought, promoteToToday, rankById, blockerById, goToItem, showChips }) {
  const [promoted, setPromoted] = useState(false);
  const cat = getCategory(item.category);
  const areaMeta = getAreaMeta(item.area);
  const AreaIcon = areaMeta.icon;
  const energyTone = item.energy === 'Low' ? 'slate' : item.energy === 'High' ? 'rose' : 'amber';
  const rank = rankById[item.id];
  const blockNote = blockerById[item.id];
  const isTop1 = rank?.rank === 1;
  return (
    <div className={`plan-task ${isTop1 ? 'plan-top1' : ''} ${blockNote ? 'plan-blocked' : ''}`}>
      <div className="plan-task-row">
        <button className="plan-check" title="Mark done" onClick={() => updateThought(item.id, { status: 'Done' })}>
          <CircleDashed size={16} />
        </button>
        {rank && <span className="plan-rank">{rank.rank}</span>}
        <button className="plan-task-text" onClick={() => goToItem(item)}>{item.text}</button>
        {showChips && <DateChips item={item} todayKey={todayKey} updateThought={updateThought} />}
      </div>
      {rank?.reason && (
        <div className="triage-line">
          <Sparkles size={12} className="triage-line-icon" />
          <span><b>Why #{rank.rank}:</b> {rank.reason}</span>
        </div>
      )}
      {blockNote && (
        <div className="triage-line triage-line-block">
          <AlertCircle size={12} className="triage-line-icon" />
          <span><b>Blocker:</b> {blockNote}</span>
        </div>
      )}
      <div className="plan-task-meta">
        <Pill tone={cat.color} className="plan-pill">{cat.short}</Pill>
        <Pill tone={areaMeta.color} className="plan-pill"><AreaIcon size={11} /> {item.area}</Pill>
        {item.energy && <Pill tone={energyTone} className="plan-pill"><EnergyIcon level={item.energy} /> {item.energy}</Pill>}
        {isTop1 && (
          <button
            className={`triage-apply-btn ${promoted ? 'applied' : ''}`}
            onClick={() => { promoteToToday('main', item.id, item.text); setPromoted(true); }}
            disabled={promoted}
          >
            {promoted ? <Check size={13} /> : <ArrowUpCircle size={13} />}
            {promoted ? 'On Today' : 'Make Main'}
          </button>
        )}
      </div>
    </div>
  );
}

function WeekView({ items, openTasks, todayKey, updateThought, promoteToToday, rankById, blockerById, setActiveTab, setSelectedCategory }) {
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDaysToKey(todayKey, i));
  const overdue = items.filter((t) => t.dueDate && t.dueDate < todayKey);
  const unscheduled = openTasks.filter((t) => !t.dueDate);
  const later = items.filter((t) => t.dueDate && t.dueDate > weekKeys[6]);

  function goToItem(item) {
    setSelectedCategory(item.category);
    setActiveTab('sort');
  }

  function loadLabel(n) {
    if (n === 0) return '—';
    if (n === 1) return '1 item · light';
    if (n <= 2) return `${n} items`;
    return `${n} items · heavy`;
  }

  function renderTask(item, showChips) {
    return (
      <PlanTask
        key={item.id} item={item} todayKey={todayKey}
        updateThought={updateThought} promoteToToday={promoteToToday}
        rankById={rankById} blockerById={blockerById}
        goToItem={goToItem} showChips={showChips}
      />
    );
  }

  return (
    <div className="plan-rail">
      {overdue.length > 0 && (
        <div className="plan-day plan-day-overdue">
          <div className="plan-day-node plan-node-red"><AlertCircle size={11} /></div>
          <div className="plan-day-head">
            <span className="plan-day-label plan-label-red">Overdue</span>
            <span className="plan-day-load">{overdue.length} item{overdue.length === 1 ? '' : 's'}</span>
          </div>
          {overdue.map((item) => renderTask(item, true))}
        </div>
      )}

      {weekKeys.map((key) => {
        const dayItems = items.filter((t) => t.dueDate === key);
        const isToday = key === todayKey;
        const dayNum = parseKey(key).getDate();
        return (
          <div key={key} className={`plan-day ${isToday ? 'plan-day-today' : ''}`}>
            <div className={`plan-day-node ${isToday ? 'plan-node-amber' : ''}`}>{dayNum}</div>
            <div className="plan-day-head">
              <span className={`plan-day-label ${isToday ? 'plan-label-amber' : ''}`}>{dayShortLabel(key, todayKey)}</span>
              <span className="plan-day-load">{loadLabel(dayItems.length)}</span>
            </div>
            {dayItems.length ? dayItems.map((item) => renderTask(item, false)) : (
              <p className="plan-day-empty">Open</p>
            )}
          </div>
        );
      })}

      {later.length > 0 && (
        <div className="plan-day">
          <div className="plan-day-node"><Telescope size={11} /></div>
          <div className="plan-day-head">
            <span className="plan-day-label">Beyond this week</span>
            <span className="plan-day-load">{later.length}</span>
          </div>
          {later
            .slice()
            .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
            .map((item) => (
              <div key={item.id} className="plan-task">
                <div className="plan-task-row">
                  <button className="plan-task-text" onClick={() => goToItem(item)}>{item.text}</button>
                  <Pill tone="slate" className="plan-pill">{dayShortLabel(item.dueDate, todayKey)}</Pill>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="plan-day">
        <div className="plan-day-node"><Inbox size={11} /></div>
        <div className="plan-day-head">
          <span className="plan-day-label">Unscheduled</span>
          <span className="plan-day-load">{unscheduled.length || '—'}</span>
        </div>
        {unscheduled.length ? (
          unscheduled.map((item) => renderTask(item, true))
        ) : (
          <p className="plan-day-empty">Every open action has a date. That's a planned week.</p>
        )}
      </div>
    </div>
  );
}

function MilestoneSlot({ missionId, weekStart, milestone, setMilestone, toggleMilestone }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(milestone?.title || '');
  useEffect(() => { setDraft(milestone?.title || ''); }, [milestone?.title]);

  function save() {
    setEditing(false);
    if ((milestone?.title || '') !== draft) setMilestone(missionId, weekStart, draft);
  }

  if (editing || (!milestone)) {
    if (!editing) {
      return (
        <button className="milestone-unset" onClick={() => setEditing(true)}>
          <Plus size={13} /> Set milestone — what does done look like this week?
        </button>
      );
    }
    return (
      <input
        autoFocus className="milestone-input" value={draft}
        placeholder="Done means…"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      />
    );
  }
  return (
    <div className="milestone-row">
      <button
        className={`milestone-check ${milestone.done ? 'done' : ''}`}
        title={milestone.done ? 'Reopen' : 'Mark done'}
        onClick={() => toggleMilestone(milestone.id, !milestone.done)}
      >
        <Check size={12} />
      </button>
      <button className={`milestone-text ${milestone.done ? 'done' : ''}`} onClick={() => setEditing(true)}>
        {milestone.title}
      </button>
    </div>
  );
}

function RoadmapView({ missions, items, milestones, todayKey, updateMission, updateThought, setMilestone, toggleMilestone, rankById, blockerById, selectedGoalId, setSelectedGoalId, setModal, setActiveTab, setSelectedCategory }) {
  const goal = missions.find((m) => m.id === selectedGoalId) || missions[0];

  if (!missions.length) {
    return (
      <div className="card">
        <EmptyState title="No goals yet" text="Create your first goal to start building a roadmap." />
        <button className="primary-button full-width" onClick={() => setModal({ type: 'goal-form', mission: null })}>
          <Plus size={16} /> New Goal
        </button>
      </div>
    );
  }

  const meta = getAreaMeta(goal.area);
  const GIcon = meta.icon;
  const linked = items.filter((t) => t.relatedMissionId === goal.id);
  const goalMilestones = milestones.filter((m) => m.missionId === goal.id);
  const blockedCount = linked.filter((t) => blockerById[t.id]).length;
  const currentWeek = weekStartKey(todayKey);
  const daysLeft = goal.targetDate ? daysBetweenKeys(todayKey, goal.targetDate) : null;
  const countdownTone = daysLeft === null ? 'slate' : daysLeft < 0 ? 'red' : daysLeft <= 7 ? 'orange' : daysLeft <= 21 ? 'amber' : 'green';

  // Ladder: from earliest milestone week (or current week) through target week, capped at 16 weeks
  let weeks = [];
  if (goal.targetDate) {
    const targetWeek = weekStartKey(goal.targetDate);
    const earliestMs = goalMilestones.length ? goalMilestones[0].weekStart : currentWeek;
    let start = earliestMs < currentWeek ? earliestMs : currentWeek;
    if (targetWeek < start) start = targetWeek;
    for (let wk = start, i = 0; wk <= targetWeek && i < 16; wk = addDaysToKey(wk, 7), i += 1) {
      weeks.push(wk);
    }
  }
  const currentIdx = weeks.indexOf(currentWeek);
  const progressPct = weeks.length > 1 && currentIdx >= 0 ? Math.round((currentIdx / (weeks.length - 1)) * 100) : 0;

  function goToItem(item) {
    setSelectedCategory(item.category);
    setActiveTab('sort');
  }

  function renderWeekTask(item) {
    const blockNote = blockerById[item.id];
    const rank = rankById[item.id];
    return (
      <div key={item.id} className={`plan-task roadmap-task ${blockNote ? 'plan-blocked' : ''}`}>
        <div className="plan-task-row">
          <button className="plan-check" title="Mark done" onClick={() => updateThought(item.id, { status: 'Done' })}>
            <CircleDashed size={15} />
          </button>
          {rank && <span className="plan-rank">{rank.rank}</span>}
          <button className="plan-task-text" onClick={() => goToItem(item)}>{item.text}</button>
          {item.dueDate && <Pill tone={item.dueDate < todayKey ? 'red' : 'slate'} className="plan-pill">{dayShortLabel(item.dueDate, todayKey).replace('Today', 'Today').split(',')[0]}</Pill>}
        </div>
        {blockNote && (
          <div className="triage-line triage-line-block">
            <AlertCircle size={12} className="triage-line-icon" />
            <span><b>Blocker:</b> {blockNote}</span>
          </div>
        )}
      </div>
    );
  }

  const undated = linked.filter((t) => !t.dueDate);

  return (
    <div className="stack">
      <div className="goal-picker">
        {missions.map((m) => {
          const mMeta = getAreaMeta(m.area);
          const MIcon = mMeta.icon;
          return (
            <button
              key={m.id}
              className={`goal-chip ${m.id === goal.id ? 'active' : ''}`}
              onClick={() => setSelectedGoalId(m.id)}
            >
              <MIcon size={13} /> {m.title}
            </button>
          );
        })}
        <button className="goal-chip goal-chip-new" onClick={() => setModal({ type: 'goal-form', mission: null })}>
          <Plus size={13} /> New Goal
        </button>
      </div>

      <div className={`card roadmap-hq roadmap-tint-${meta.color}`}>
        <div className="roadmap-head">
          <div className="roadmap-title">
            <GIcon size={17} className={`stat-icon-${meta.color}`} />
            <h3>{goal.title}</h3>
          </div>
          <div className="roadmap-head-actions">
            {daysLeft !== null ? (
              <Pill tone={countdownTone}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d past` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}</Pill>
            ) : (
              <Pill tone="slate">No target</Pill>
            )}
            <button className="icon-only-btn" title="Edit goal" onClick={() => setModal({ type: 'goal-form', mission: goal })}>
              <Edit3 size={15} />
            </button>
          </div>
        </div>
        {goal.why && <p className="roadmap-why">{goal.why}</p>}
        <p className="roadmap-sub">
          {goal.targetDate ? `Target: ${formatDateFull(goal.targetDate)}` : 'No target date set'}
          {' · '}{linked.length} open item{linked.length === 1 ? '' : 's'}
          {blockedCount > 0 && <span className="roadmap-blocked-note"> · {blockedCount} blocked</span>}
        </p>

        {!goal.targetDate && (
          <div className="roadmap-target-prompt">
            <label className="roadmap-target-label">Set a target date to build the week-by-week ladder</label>
            <input
              type="date" className="date-chip-input roadmap-target-input"
              value=""
              onChange={(e) => updateMission(goal.id, { targetDate: e.target.value })}
            />
          </div>
        )}

        {goal.targetDate && weeks.length > 0 && (
          <>
            <div className="roadmap-progress">
              <div className="prog-track"><div className="prog-fill" style={{ width: `${progressPct}%` }} /></div>
              <div className="prog-labels">
                <span>{dayShortLabel(todayKey, todayKey)}</span>
                <span>{currentIdx >= 0 ? `Week ${currentIdx + 1} of ${weeks.length}` : `${weeks.length} weeks`}</span>
                <span>{formatDate(goal.targetDate + 'T00:00:00')}</span>
              </div>
            </div>

            <div className="roadmap-ladder">
              {weeks.map((wk, i) => {
                const ms = goalMilestones.find((m) => m.weekStart === wk) || null;
                const weekTasks = linked.filter((t) => t.dueDate && weekStartKey(t.dueDate) === wk);
                const isNow = wk === currentWeek;
                const isPast = wk < currentWeek;
                return (
                  <div key={wk} className={`roadmap-week ${isNow ? 'now' : ''} ${ms?.done ? 'done' : ''} ${isPast && !ms?.done ? 'past' : ''}`}>
                    <div className="roadmap-week-dot" />
                    <div className="roadmap-week-head">
                      <span className="roadmap-week-label">Week {i + 1} · {weekRangeLabel(wk)}{isNow ? ' · Now' : ''}</span>
                      {ms?.done && <Pill tone="green" className="plan-pill">Done</Pill>}
                      {!ms?.done && weekTasks.length > 0 && <span className="plan-day-load">{weekTasks.length} item{weekTasks.length === 1 ? '' : 's'}</span>}
                    </div>
                    <MilestoneSlot
                      missionId={goal.id} weekStart={wk} milestone={ms}
                      setMilestone={setMilestone} toggleMilestone={toggleMilestone}
                    />
                    {weekTasks.length > 0 && (
                      <div className="roadmap-week-tasks">
                        {weekTasks.map(renderWeekTask)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {undated.length > 0 && (
          <div className="roadmap-undated">
            <p className="triage-section-label"><Inbox size={13} /> Linked, no date yet</p>
            {undated.map((item) => (
              <div key={item.id} className="plan-task roadmap-task">
                <div className="plan-task-row">
                  <button className="plan-check" title="Mark done" onClick={() => updateThought(item.id, { status: 'Done' })}>
                    <CircleDashed size={15} />
                  </button>
                  <button className="plan-task-text" onClick={() => goToItem(item)}>{item.text}</button>
                  <DateChips item={item} todayKey={todayKey} updateThought={updateThought} />
                </div>
              </div>
            ))}
          </div>
        )}

        {linked.length === 0 && (
          <p className="muted small">No open items linked to this goal yet. Link items in Sort (set their related goal) and they'll appear on the ladder by due date.</p>
        )}
      </div>
    </div>
  );
}

function GoalFormModal({ mission, addMission, updateMission, deleteMission, onClose }) {
  const [form, setForm] = useState({
    title: mission?.title || '',
    why: mission?.why || '',
    area: mission?.area || 'Personal',
    targetDate: mission?.targetDate || '',
    status: mission?.status || 'Open',
  });
  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function submit() {
    if (!form.title.trim()) return;
    if (mission) updateMission(mission.id, form);
    else addMission(form);
    onClose();
  }
  function handleDelete() {
    if (window.confirm(`Delete goal "${mission.title}"? Its weekly milestones will be deleted too. Linked items stay in Sort.`)) {
      deleteMission(mission.id);
      onClose();
    }
  }
  return (
    <div className="capture-form">
      <Field label="Goal"><input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Paragon Repricing Tool" /></Field>
      <Field label="Why it matters"><textarea value={form.why} onChange={(e) => set('why', e.target.value)} /></Field>
      <Field label="Life area">
        <select value={form.area} onChange={(e) => set('area', e.target.value)}>
          {lifeAreas.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Field>
      <Field label="Target date"><input type="date" value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></Field>
      <Field label="Status">
        <select value={form.status} onChange={(e) => set('status', e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <button className="primary-button" onClick={submit}><Save size={16} /> {mission ? 'Save Goal' : 'Create Goal'}</button>
      {mission && (
        <button className="danger-button" onClick={handleDelete}><Trash2 size={15} /> Delete goal</button>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
