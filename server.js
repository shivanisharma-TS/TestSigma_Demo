import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app        = express();
const PORT       = process.env.PORT || 3000;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;
const ADMIN_SECRET  = process.env.ADMIN_SECRET;
const CRON_SECRET   = process.env.CRON_SECRET;
const DB_PATH = path.join(__dirname, 'data', 'state.json');

// ── Seed data from TAM_Product_RTM.xlsx ───────────────────────
const SEED_TOPICS = [
  'SignUp & Login','DashBoard','Project','Project Settings',
  'TestCases','Stepgroups','Elements','TestData Profile',
  'Environments','Uploads','TestSuites','TestPlans',
  'Run Results','Settings','Addons','Usage Details',
  'Agents','Whats New','Help & Support','User Profile',
  'Recorder','Debugger','Desktop',
  'Salesforce Application',
  'Co Pilot','AI Features'
];

const SEED_PEOPLE = [
  'Sandeep','Hari Chandana','Nixon','Shivani',
  'Osten','Mohan','Aarthy','Jadson'
];

app.use(cors());
app.use(express.json());

// ── State helpers ──────────────────────────────────────────────
function loadState() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    // First boot — seed with RTM topics and team members
    const s = { topics: [...SEED_TOPICS], people: [...SEED_PEOPLE], deck: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2));
    console.log(`[server] Seeded ${s.topics.length} topics and ${s.people.length} people`);
    return s;
  }
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return { topics: [...SEED_TOPICS], people: [...SEED_PEOPLE], deck: [] }; }
}

function saveState(s) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2));
}

// ── Auth middleware ────────────────────────────────────────────
function auth(req, res, next) {
  if (!ADMIN_SECRET) return res.status(500).json({ error: 'ADMIN_SECRET not configured on server' });
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized — wrong ADMIN_SECRET' });
  next();
}

// ── Shuffle engine ─────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAssignments(state) {
  const clone = JSON.parse(JSON.stringify(state));
  // Refill deck when exhausted — no repeats until all topics used
  if (clone.deck.length < clone.people.length * 2) {
    clone.deck = shuffle([...clone.topics]);
  }
  const people = shuffle([...clone.people]);
  const rows = people.map(person => ({
    person,
    topic1: clone.deck.shift() || '—',
    topic2: clone.deck.shift() || '—',
  }));
  return { rows, committedState: clone };
}

// ── Topics routes ──────────────────────────────────────────────
app.get('/api/topics', (req, res) => {
  const s = loadState();
  res.json({ items: s.topics, deckRemaining: s.deck.length });
});

app.post('/api/topics', auth, (req, res) => {
  const val = (req.body.value || '').trim();
  if (!val) return res.status(400).json({ error: 'value required' });
  const s = loadState();
  if (s.topics.includes(val)) return res.status(409).json({ error: 'Topic already exists' });
  s.topics.push(val);
  saveState(s);
  res.json({ ok: true, items: s.topics });
});

app.post('/api/topics/remove', auth, (req, res) => {
  const val = (req.body.value || '').trim();
  const s = loadState();
  s.topics = s.topics.filter(t => t !== val);
  s.deck   = s.deck.filter(t => t !== val);
  saveState(s);
  res.json({ ok: true, items: s.topics });
});

// ── People routes  ─────────────────────────────────────────────
// NOTE: route is /api/people — NOT /api/persons
app.get('/api/people', (req, res) => {
  res.json({ items: loadState().people });
});

app.post('/api/people', auth, (req, res) => {
  const val = (req.body.value || '').trim();
  if (!val) return res.status(400).json({ error: 'value required' });
  const s = loadState();
  if (s.people.includes(val)) return res.status(409).json({ error: 'Person already exists' });
  s.people.push(val);
  saveState(s);
  res.json({ ok: true, items: s.people });
});

app.post('/api/people/remove', auth, (req, res) => {
  const val = (req.body.value || '').trim();
  const s = loadState();
  s.people = s.people.filter(p => p !== val);
  saveState(s);
  res.json({ ok: true, items: s.people });
});

// ── Reset to seed data ─────────────────────────────────────────
app.post('/api/reset', auth, (req, res) => {
  const s = { topics: [...SEED_TOPICS], people: [...SEED_PEOPLE], deck: [] };
  saveState(s);
  res.json({ ok: true, message: 'Reset to RTM seed data', topics: s.topics.length, people: s.people.length });
});

// ── Preview (non-destructive) ──────────────────────────────────
app.get('/api/preview', (req, res) => {
  const s = loadState();
  if (!s.people.length)       return res.json({ rows: [], warning: 'No people added yet.' });
  if (s.topics.length < 2)    return res.json({ rows: [], warning: 'Add at least 2 topics.' });
  const { rows } = buildAssignments(s);
  res.json({ rows });
});

// ── Send to Slack (manual from admin panel) ────────────────────
app.post('/api/notify', auth, async (req, res) => {
  const s = loadState();
  if (!s.people.length || s.topics.length < 2)
    return res.status(400).json({ error: 'Not enough people or topics' });
  const { rows, committedState } = buildAssignments(s);
  try {
    await postToSlack(rows);
    saveState(committedState);
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Cron endpoint (called by GitHub Actions every Friday) ──────
app.post('/api/cron/weekly', async (req, res) => {
  if (!CRON_SECRET || req.headers['x-cron-secret'] !== CRON_SECRET)
    return res.status(401).json({ error: 'Unauthorized — wrong CRON_SECRET' });
  const s = loadState();
  if (!s.people.length || s.topics.length < 2)
    return res.status(400).json({ error: 'Not enough data — add topics and people first' });
  const { rows, committedState } = buildAssignments(s);
  try {
    await postToSlack(rows);
    saveState(committedState);
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  const s = loadState();
  res.json({
    status: 'ok',
    ts: new Date().toISOString(),
    topics: s.topics.length,
    people: s.people.length,
    deckRemaining: s.deck.length,
  });
});

// ── Slack formatter ────────────────────────────────────────────
async function postToSlack(rows) {
  if (!SLACK_WEBHOOK) throw new Error('SLACK_WEBHOOK_URL not configured on server');

  const today   = new Date();
  const pad     = n => String(n).padStart(2, '0');
  const dateStr = `${pad(today.getDate())}/${pad(today.getMonth()+1)}/${today.getFullYear()}`;

  // Fixed-width table using Slack monospace code block
  const col1 = Math.max(6,  ...rows.map(r => r.person.length)) + 2;
  const col2 = Math.max(7,  ...rows.map(r => r.topic1.length)) + 2;
  const col3 = Math.max(7,  ...rows.map(r => r.topic2.length)) + 2;

  const sep  = `${'─'.repeat(col1)}┼${'─'.repeat(col2)}┼${'─'.repeat(col3)}`;
  const head = `${'Person'.padEnd(col1)}│${'Topic 1'.padEnd(col2)}│${'Topic 2'.padEnd(col3)}`;
  const body = rows.map(r =>
    `${r.person.padEnd(col1)}│${r.topic1.padEnd(col2)}│${r.topic2.padEnd(col3)}`
  ).join('\n');

  const text = [
    `*📅 TAM Weekly Module Assignments — ${dateStr}*`,
    '```',
    head,
    sep,
    body,
    '```',
    `_${rows.length} members · 2 topics each · shuffle deck restarts after all ${rows.reduce(()=>0)||26} topics are used_`
  ].join('\n');

  const r = await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) throw new Error(`Slack returned ${r.status}: ${await r.text()}`);
}

app.listen(PORT, () => {
  const s = loadState();
  console.log(`[server] Running on port ${PORT}`);
  console.log(`[server] SLACK_WEBHOOK_URL : ${SLACK_WEBHOOK ? '✓' : '✗ MISSING'}`);
  console.log(`[server] ADMIN_SECRET      : ${ADMIN_SECRET  ? '✓' : '✗ MISSING'}`);
  console.log(`[server] CRON_SECRET       : ${CRON_SECRET   ? '✓' : '✗ MISSING'}`);
  console.log(`[server] Topics loaded     : ${s.topics.length}`);
  console.log(`[server] People loaded     : ${s.people.length}`);
});
