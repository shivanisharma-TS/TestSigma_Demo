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
const DB_PATH       = path.join(__dirname, 'data', 'state.json');
const DAYS          = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

app.use(cors());
app.use(express.json());

// ── State persistence ─────────────────────────────────────────────────────────
function loadState() {
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const init = { topics: [], people: [], topicDeck: [], deckUsed: 0 };
    fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
    return init;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('[state] parse error:', e.message);
    return { topics: [], people: [], topicDeck: [], deckUsed: 0 };
  }
}

function saveState(s) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(s, null, 2));
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (!ADMIN_SECRET)
    return res.status(500).json({ error: 'ADMIN_SECRET env var not configured on server' });
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Deck-shuffle engine ────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickTopics(state, count) {
  if (state.topicDeck.length < count) {
    const leftover = state.topicDeck;
    const fresh = shuffle(state.topics.filter(t => !leftover.includes(t)));
    state.topicDeck = [...leftover, ...fresh];
    state.deckUsed = 0;
  }
  const picked = state.topicDeck.splice(0, count);
  state.deckUsed += count;
  return picked;
}

function buildSchedule(state) {
  const s = JSON.parse(JSON.stringify(state)); // deep clone — preview safe
  const people = shuffle([...s.people]);
  const schedule = people.map((person, idx) => ({
    person,
    topics: pickTopics(s, 2),
    day: DAYS[idx % DAYS.length]
  }));
  return { schedule, committed: s };
}

// ── Topics routes ─────────────────────────────────────────────────────────────
app.get('/api/topics', (req, res) => {
  const s = loadState();
  res.json({ items: s.topics, deckUsed: s.deckUsed, total: s.topics.length });
});

app.post('/api/topics', auth, (req, res) => {
  const v = (req.body.value || '').trim();
  if (!v) return res.status(400).json({ error: 'value required' });
  const s = loadState();
  if (s.topics.includes(v)) return res.status(409).json({ error: 'Already exists' });
  s.topics.push(v);
  saveState(s);
  res.json({ ok: true, items: s.topics });
});

app.post('/api/topics/remove', auth, (req, res) => {
  const v = (req.body.value || '').trim();
  const s = loadState();
  s.topics    = s.topics.filter(t => t !== v);
  s.topicDeck = s.topicDeck.filter(t => t !== v);
  saveState(s);
  res.json({ ok: true, items: s.topics });
});

// ── People routes ─────────────────────────────────────────────────────────────
app.get('/api/people', (req, res) => {
  const s = loadState();
  res.json({ items: s.people });
});

app.post('/api/people', auth, (req, res) => {
  const v = (req.body.value || '').trim();
  if (!v) return res.status(400).json({ error: 'value required' });
  const s = loadState();
  if (s.people.includes(v)) return res.status(409).json({ error: 'Already exists' });
  s.people.push(v);
  saveState(s);
  res.json({ ok: true, items: s.people });
});

app.post('/api/people/remove', auth, (req, res) => {
  const v = (req.body.value || '').trim();
  const s = loadState();
  s.people = s.people.filter(p => p !== v);
  saveState(s);
  res.json({ ok: true, items: s.people });
});

// ── Preview (non-destructive — does not commit deck state) ────────────────────
app.get('/api/preview', (req, res) => {
  const s = loadState();
  if (!s.people.length || !s.topics.length)
    return res.json({ schedule: [], warning: 'Add at least 1 person and 2 topics first.' });
  if (s.topics.length < 2)
    return res.json({ schedule: [], warning: 'Need at least 2 topics to assign 2 per person.' });
  const { schedule } = buildSchedule(s);
  res.json({ schedule });
});

// ── Notify — commits deck state and posts to Slack ────────────────────────────
app.post('/api/notify', auth, async (req, res) => {
  const s = loadState();
  if (!s.people.length || s.topics.length < 2)
    return res.status(400).json({ error: 'Need at least 1 person and 2 topics' });
  const { schedule, committed } = buildSchedule(s);
  s.topicDeck = committed.topicDeck;
  s.deckUsed  = committed.deckUsed;
  saveState(s);
  try {
    await postToSlack(schedule);
    res.json({ ok: true, schedule });
  } catch (e) {
    console.error('[notify] Slack error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Cron endpoint — called by Render Cron every Friday ────────────────────────
app.post('/api/cron/weekly', async (req, res) => {
  if (!CRON_SECRET || req.headers['x-cron-secret'] !== CRON_SECRET)
    return res.status(401).json({ error: 'Unauthorized' });
  const s = loadState();
  if (!s.people.length || s.topics.length < 2)
    return res.status(400).json({ error: 'Insufficient data' });
  const { schedule, committed } = buildSchedule(s);
  s.topicDeck = committed.topicDeck;
  s.deckUsed  = committed.deckUsed;
  saveState(s);
  try {
    await postToSlack(schedule);
    console.log('[cron] Schedule posted at', new Date().toISOString());
    res.json({ ok: true });
  } catch (e) {
    console.error('[cron] Slack error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// ── Slack message formatter ────────────────────────────────────────────────────
async function postToSlack(schedule) {
  if (!SLACK_WEBHOOK) throw new Error('SLACK_WEBHOOK_URL is not set');

  const monday = getNextMonday();
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  const fmt = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const header  = `${'Person'.padEnd(22)} ${'Topics'.padEnd(46)} Day`;
  const divider = `${'─'.repeat(22)} ${'─'.repeat(46)} ${'─'.repeat(9)}`;
  const rows    = schedule.map(r =>
    `${r.person.padEnd(22)} ${r.topics.join(', ').padEnd(46)} ${r.day}`
  ).join('\n');

  const totalTopics = schedule.reduce((a, r) => a + r.topics.length, 0);
  const text = [
    `*📅 Schedule for ${fmt(monday)} – ${fmt(friday)}*`,
    '```',
    header, divider, rows,
    '```',
    `_2 topics per person · Deck resets after all ${totalTopics} slots filled_`
  ].join('\n');

  const r = await fetch(SLACK_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!r.ok) throw new Error(`Slack ${r.status}: ${await r.text()}`);
}

function getNextMonday() {
  const d = new Date();
  const diff = (d.getDay() === 0) ? 1 : (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Running on port ${PORT}`);
  console.log(`[server] SLACK_WEBHOOK_URL : ${SLACK_WEBHOOK ? '✓' : '✗ MISSING'}`);
  console.log(`[server] ADMIN_SECRET      : ${ADMIN_SECRET  ? '✓' : '✗ MISSING'}`);
  console.log(`[server] CRON_SECRET       : ${CRON_SECRET   ? '✓' : '✗ MISSING'}`);
});
