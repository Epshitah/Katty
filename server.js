const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'ralejoemolebatsi189@gmail.com').toLowerCase();

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add the PostgreSQL connection in Render Environment Variables.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function db(query, params = []) {
  return pool.query(query, params);
}

async function initDb() {
  await db(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT DEFAULT 'Other',
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      cover TEXT DEFAULT '',
      published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      url TEXT NOT NULL,
      thumbnail TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

async function user(req) {
  if (!req.session.userId) return null;
  const r = await db('SELECT id, name, email FROM users WHERE id=$1', [req.session.userId]);
  return r.rows[0] || null;
}

async function admin(req) {
  const u = await user(req);
  return u && u.email.toLowerCase() === ADMIN_EMAIL ? u : null;
}

async function requireLogin(req, res, next) {
  try {
    const u = await user(req);
    if (!u) return res.status(401).json({ error: 'Please log in.' });
    req.currentUser = u;
    next();
  } catch (e) { next(e); }
}

async function requireAdmin(req, res, next) {
  try {
    const u = await admin(req);
    if (!u) return res.status(403).json({ error: 'Admin access required.' });
    req.currentUser = u;
    next();
  } catch (e) { next(e); }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.use(express.static(__dirname));

app.post('/api/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || password.length < 6) {
      return res.status(400).json({ error: 'Enter your name, email and a password of at least 6 characters.' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const r = await db('INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING id,name,email', [name, email, hash]);
    const u = r.rows[0];
    req.session.userId = u.id;
    res.json({ user: { ...u, isAdmin: email === ADMIN_EMAIL } });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'That email is already registered.' });
    console.error(e);
    res.status(400).json({ error: 'Could not create account.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const r = await db('SELECT * FROM users WHERE email=$1', [email]);
    const u = r.rows[0];
    if (!u || !bcrypt.compareSync(password, u.password)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    req.session.userId = u.id;
    res.json({ user: { id: u.id, name: u.name, email: u.email, isAdmin: u.email === ADMIN_EMAIL } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', async (req, res, next) => {
  try {
    const u = await user(req);
    res.json({ user: u ? { ...u, isAdmin: u.email.toLowerCase() === ADMIN_EMAIL } : null });
  } catch (e) { next(e); }
});

app.get('/api/stories', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const genre = String(req.query.genre || '').trim();
    let sql = 'SELECT id,title,genre,description,cover,published,created_at,updated_at FROM stories WHERE published=TRUE';
    const args = [];
    if (q) { sql += ' AND (title ILIKE $1 OR description ILIKE $2 OR genre ILIKE $3)'; const x = `%${q}%`; args.push(x, x, x); }
    if (genre && genre !== 'All') { args.push(genre); sql += ` AND genre=$${args.length}`; }
    sql += ' ORDER BY updated_at DESC,id DESC';
    const r = await db(sql, args);
    res.json({ stories: r.rows });
  } catch (e) { next(e); }
});

app.get('/api/stories/:id', async (req, res, next) => {
  try {
    const r = await db('SELECT * FROM stories WHERE id=$1 AND published=TRUE', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Story not found.' });
    res.json({ story: r.rows[0] });
  } catch (e) { next(e); }
});

app.get('/api/admin/stories', requireAdmin, async (req, res, next) => {
  try { const r = await db('SELECT * FROM stories ORDER BY updated_at DESC,id DESC'); res.json({ stories: r.rows }); } catch (e) { next(e); }
});

app.post('/api/admin/stories', requireAdmin, async (req, res, next) => {
  try {
    const { title, genre = 'Other', description = '', content, cover = '', published = false } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and story content are required.' });
    const r = await db('INSERT INTO stories(title,genre,description,content,cover,published,updated_at) VALUES($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP) RETURNING *', [String(title).trim(), String(genre).trim(), String(description), String(content), String(cover), !!published]);
    res.json({ story: r.rows[0] });
  } catch (e) { next(e); }
});

app.put('/api/admin/stories/:id', requireAdmin, async (req, res, next) => {
  try {
    const { title, genre = 'Other', description = '', content, cover = '', published = false } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and story content are required.' });
    const r = await db('UPDATE stories SET title=$1,genre=$2,description=$3,content=$4,cover=$5,published=$6,updated_at=CURRENT_TIMESTAMP WHERE id=$7 RETURNING *', [String(title).trim(), String(genre).trim(), String(description), String(content), String(cover), !!published, req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Story not found.' });
    res.json({ story: r.rows[0] });
  } catch (e) { next(e); }
});

app.delete('/api/admin/stories/:id', requireAdmin, async (req, res, next) => {
  try { const r = await db('DELETE FROM stories WHERE id=$1 RETURNING id', [req.params.id]); if (!r.rows[0]) return res.status(404).json({ error: 'Story not found.' }); res.json({ ok: true }); } catch (e) { next(e); }
});

app.patch('/api/admin/stories/:id/publish', requireAdmin, async (req, res, next) => {
  try {
    const r = await db('SELECT published FROM stories WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Story not found.' });
    const p = !r.rows[0].published;
    await db('UPDATE stories SET published=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2', [p, req.params.id]);
    res.json({ published: p });
  } catch (e) { next(e); }
});

app.get('/api/videos', async (req, res, next) => { try { const r = await db('SELECT * FROM videos ORDER BY created_at DESC,id DESC'); res.json({ videos: r.rows }); } catch (e) { next(e); } });
app.get('/api/admin/videos', requireAdmin, async (req, res, next) => { try { const r = await db('SELECT * FROM videos ORDER BY created_at DESC,id DESC'); res.json({ videos: r.rows }); } catch (e) { next(e); } });

app.post('/api/admin/videos', requireAdmin, async (req, res, next) => {
  try {
    const { title, description = '', url, thumbnail = '' } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Video title and URL are required.' });
    const r = await db('INSERT INTO videos(title,description,url,thumbnail) VALUES($1,$2,$3,$4) RETURNING *', [String(title).trim(), String(description), String(url).trim(), String(thumbnail)]);
    res.json({ video: r.rows[0] });
  } catch (e) { next(e); }
});

app.put('/api/admin/videos/:id', requireAdmin, async (req, res, next) => {
  try {
    const { title, description = '', url, thumbnail = '' } = req.body;
    if (!title || !url) return res.status(400).json({ error: 'Video title and URL are required.' });
    const r = await db('UPDATE videos SET title=$1,description=$2,url=$3,thumbnail=$4 WHERE id=$5 RETURNING *', [String(title).trim(), String(description), String(url).trim(), String(thumbnail), req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found.' });
    res.json({ video: r.rows[0] });
  } catch (e) { next(e); }
});

app.delete('/api/admin/videos/:id', requireAdmin, async (req, res, next) => {
  try { const r = await db('DELETE FROM videos WHERE id=$1 RETURNING id', [req.params.id]); if (!r.rows[0]) return res.status(404).json({ error: 'Video not found.' }); res.json({ ok: true }); } catch (e) { next(e); }
});

app.get('/api/admin/stats', requireAdmin, async (req, res, next) => {
  try {
    const [a,b,c,d] = await Promise.all([
      db('SELECT COUNT(*)::int AS n FROM stories'),
      db('SELECT COUNT(*)::int AS n FROM stories WHERE published=TRUE'),
      db('SELECT COUNT(*)::int AS n FROM videos'),
      db('SELECT COUNT(*)::int AS n FROM users')
    ]);
    const total = a.rows[0].n, published = b.rows[0].n;
    res.json({ total, published, drafts: total - published, videos: c.rows[0].n, users: d.rows[0].n });
  } catch (e) { next(e); }
});

app.use((err, req, res, next) => { console.error(err); if (!res.headersSent) res.status(500).json({ error: 'Server error.' }); });

initDb().then(() => {
  app.listen(PORT, () => console.log(`Epshitah Stories running on ${PORT} with PostgreSQL`));
}).catch(err => { console.error('Database initialization failed:', err); process.exit(1); });
