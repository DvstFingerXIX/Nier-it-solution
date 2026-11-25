CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  contact TEXT NOT NULL,
  request_type TEXT,
  category TEXT,
  quantity TEXT,
  needed_by TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  ip_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status, created_at);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  message TEXT NOT NULL,
  photo TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'admin',
  sort INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT
);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  caption TEXT,
  category TEXT,
  image TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS login_attempts (
  ip_hash TEXT,
  ts INTEGER
);
