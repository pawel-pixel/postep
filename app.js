'use strict';

const STORAGE_KEY = 'qp_data_v1';
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];

const CATEGORIES = [
  { id: 'health', label: 'Zdrowie' },
  { id: 'growth', label: 'Praca i rozwój' },
];

const DEFAULT_HABITS = [
  { id: 'h1', emoji: '🏋️', name: 'Trening', category: 'health' },
  { id: 'h2', emoji: '💊', name: 'Suplementy', category: 'health' },
  { id: 'h3', emoji: '🧊', name: 'Zimny prysznic', category: 'health' },
  { id: 'h4', emoji: '🚶', name: '10k kroków / rower', category: 'health' },
  { id: 'h5', emoji: '🧠', name: 'Nauka / rozwój', category: 'growth' },
  { id: 'h6', emoji: '📖', name: 'Czytanie', category: 'growth' },
  { id: 'h7', emoji: '🙏', name: 'Modlitwa', category: 'growth' },
  { id: 'h8', emoji: '✝️', name: 'Ewangelia', category: 'growth' },
  { id: 'h9', emoji: '💰', name: 'Krok w stronę zarobków', category: 'growth' },
  { id: 'h10', emoji: '🚀', name: 'Praca nad side hustle', category: 'growth' },
];

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function startOfWeek(d) {
  const nd = new Date(d);
  const dow = (nd.getDay() + 6) % 7; // Monday = 0
  nd.setDate(nd.getDate() - dow);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ---------- state ----------

function freshData() {
  return {
    habits: DEFAULT_HABITS.slice(),
    days: {},
    book: null,
    finishedBooks: [],
  };
}

function loadData() {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
  if (!raw) return freshData();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.habits) parsed.habits = [];
    if (!parsed.days) parsed.days = {};
    if (parsed.book === undefined) parsed.book = null;
    if (!parsed.finishedBooks) parsed.finishedBooks = [];
    return parsed;
  } catch (e) {
    return freshData();
  }
}

let data = loadData();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getDay(key) {
  if (!data.days[key]) {
    data.days[key] = { habits: {}, tasks: [], mood: null, pagesRead: 0, earnings: 0 };
  }
  if (!data.days[key].tasks) data.days[key].tasks = [];
  if (!data.days[key].habits) data.days[key].habits = {};
  if (!data.days[key].pagesRead) data.days[key].pagesRead = 0;
  if (!data.days[key].earnings) data.days[key].earnings = 0;
  return data.days[key];
}

function dayCompletion(key) {
  const habits = data.habits;
  if (!habits.length) return 0;
  const day = data.days[key];
  if (!day) return 0;
  const done = habits.filter(h => day.habits[h.id]).length;
  return done / habits.length;
}

function habitCat(h) {
  return h.category === 'growth' ? 'growth' : 'health';
}

function categoryCompletion(key, cat) {
  const habits = data.habits.filter(h => habitCat(h) === cat);
  if (!habits.length) return 0;
  const day = data.days[key];
  if (!day) return 0;
  const done = habits.filter(h => day.habits[h.id]).length;
  return done / habits.length;
}

// ---------- view switching ----------

let currentView = 'today';
let weekAnchor = startOfWeek(new Date());

const views = {
  today: document.getElementById('view-today'),
  week: document.getElementById('view-week'),
  stats: document.getElementById('view-stats'),
  settings: document.getElementById('view-settings'),
};

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(name) {
  currentView = name;
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  render();
}

// ---------- rendering: today ----------

function renderHeader() {
  const heading = document.getElementById('dateHeading');
  const labels = { today: 'Dziś', week: 'Tydzień', stats: 'Statystyki', settings: 'Ustawienia' };
  heading.textContent = labels[currentView];

  const sub = document.getElementById('dateSubheading');
  const fmt = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  sub.textContent = fmt.format(new Date()).toUpperCase();

  const pct = dayCompletion(todayKey());
  const fg = document.getElementById('dayRingFg');
  const circumference = 106.8;
  fg.style.strokeDashoffset = String(circumference * (1 - pct));
  document.getElementById('dayRingLabel').textContent = Math.round(pct * 100) + '%';
}

function renderMood() {
  const key = todayKey();
  const day = getDay(key);
  const row = document.getElementById('moodRow');
  row.innerHTML = '';
  MOODS.forEach((emoji, i) => {
    const btn = document.createElement('button');
    btn.className = 'mood-btn' + (day.mood === i ? ' selected' : '');
    btn.textContent = emoji;
    btn.addEventListener('click', () => {
      day.mood = day.mood === i ? null : i;
      save();
      renderMood();
    });
    row.appendChild(btn);
  });
}

function renderHabitsToday() {
  const key = todayKey();
  const day = getDay(key);
  document.getElementById('habitEmptyHint').hidden = data.habits.length > 0;

  CATEGORIES.forEach(cat => {
    const list = document.getElementById(`habitList-${cat.id}`);
    list.innerHTML = '';
    const habits = data.habits.filter(h => habitCat(h) === cat.id);

    habits.forEach((h, i) => {
      const li = document.createElement('li');
      li.className = 'habit-item';
      const done = !!day.habits[h.id];
      li.innerHTML = `
        <span class="habit-num mono">${i + 1}</span>
        <button class="habit-check ${done ? 'done' : ''}">✓</button>
        <span class="habit-emoji">${h.emoji || '•'}</span>
        <span class="habit-name ${done ? 'done' : ''}">${escapeHtml(h.name)}</span>
      `;
      li.querySelector('.habit-check').addEventListener('click', () => {
        day.habits[h.id] = !day.habits[h.id];
        save();
        renderHabitsToday();
        renderHeader();
      });
      list.appendChild(li);
    });

    const frac = categoryCompletion(key, cat.id);
    const pct = Math.round(frac * 100);
    document.getElementById(`ringLabel-${cat.id}`).textContent = pct + '%';
    const fg = document.getElementById(`ringFg-${cat.id}`);
    const circumference = 106.8;
    fg.style.strokeDashoffset = String(circumference * (1 - frac));
  });
}

function renderTasks() {
  const key = todayKey();
  const day = getDay(key);
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  day.tasks.forEach(t => {
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <button class="task-check ${t.done ? 'done' : ''}">✓</button>
      <span class="task-text ${t.done ? 'done' : ''}">${escapeHtml(t.text)}</span>
      <button class="task-del" aria-label="Usuń">×</button>
    `;
    li.querySelector('.task-check').addEventListener('click', () => {
      t.done = !t.done;
      save();
      renderTasks();
    });
    li.querySelector('.task-del').addEventListener('click', () => {
      day.tasks = day.tasks.filter(x => x.id !== t.id);
      save();
      renderTasks();
    });
    list.appendChild(li);
  });
}

document.getElementById('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const text = input.value.trim();
  if (!text) return;
  const day = getDay(todayKey());
  day.tasks.push({ id: uid(), text, done: false });
  input.value = '';
  save();
  renderTasks();
});

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// ---------- book ----------

function bookPagesRead() {
  if (!data.book) return 0;
  return Object.entries(data.days)
    .filter(([key]) => key >= data.book.startDate)
    .reduce((sum, [, day]) => sum + (day.pagesRead || 0), 0);
}

function renderBook() {
  const setupForm = document.getElementById('bookSetupForm');
  const active = document.getElementById('bookActive');
  const pagesForm = document.getElementById('bookPagesForm');

  document.getElementById('booksReadCount').textContent = String(data.finishedBooks.length);

  if (!data.book) {
    setupForm.hidden = false;
    active.hidden = true;
    return;
  }

  setupForm.hidden = true;
  active.hidden = false;

  const read = Math.min(bookPagesRead(), data.book.totalPages);
  const pct = data.book.totalPages ? Math.round((read / data.book.totalPages) * 100) : 0;
  const finished = read >= data.book.totalPages;

  document.getElementById('bookTitleDisplay').textContent = data.book.title + (finished ? ' — ukończono 🎉' : '');
  document.getElementById('bookProgressFill').style.width = Math.min(pct, 100) + '%';
  document.getElementById('bookProgressLabel').textContent = `${read} / ${data.book.totalPages} stron (${pct}%)`;
  pagesForm.hidden = finished;
}

document.getElementById('bookSetupForm').addEventListener('submit', e => {
  e.preventDefault();
  const titleInput = document.getElementById('bookTitleInput');
  const pagesInput = document.getElementById('bookPagesInput');
  const title = titleInput.value.trim();
  const pages = parseInt(pagesInput.value, 10);
  if (!title || !pages || pages < 1) return;
  data.book = { title, totalPages: pages, startDate: todayKey() };
  titleInput.value = '';
  pagesInput.value = '';
  save();
  renderBook();
});

document.getElementById('bookPagesForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('bookPagesToday');
  const pages = parseInt(input.value, 10);
  if (!pages || pages < 1) return;
  const day = getDay(todayKey());
  day.pagesRead += pages;
  input.value = '';
  save();
  renderBook();
});

document.getElementById('bookResetBtn').addEventListener('click', () => {
  if (!data.book) return;
  const finished = bookPagesRead() >= data.book.totalPages;
  if (finished) {
    data.finishedBooks.push({ title: data.book.title, finishedDate: todayKey() });
  } else if (!confirm(`Zacząć nową książkę? „${data.book.title}” nie zostanie odznaczona jako ukończona.`)) {
    return;
  }
  data.book = null;
  save();
  renderBook();
});

// ---------- earnings ----------

function renderEarningsInput() {
  const day = getDay(todayKey());
  const input = document.getElementById('earningsInput');
  if (document.activeElement !== input) {
    input.value = day.earnings || '';
  }
}

document.getElementById('earningsInput').addEventListener('change', () => {
  const input = document.getElementById('earningsInput');
  const day = getDay(todayKey());
  day.earnings = Math.max(0, parseInt(input.value, 10) || 0);
  save();
});

function renderEarningsChart() {
  const svg = document.getElementById('earningsChart');
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), -(13 - i)));
  const values = days.map(d => (data.days[todayKey(d)] && data.days[todayKey(d)].earnings) || 0);
  const max = Math.max(1, ...values);

  const W = 336, H = 120, labelH = 16, chartH = H - labelH;
  const slot = W / 14;
  const barW = Math.max(4, slot - 6);

  let markup = '';
  values.forEach((v, i) => {
    const h = (v / max) * (chartH - 6);
    const x = i * slot + (slot - barW) / 2;
    const y = chartH - h;
    markup += `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="2"></rect>`;
    if (i % 2 === 0) {
      markup += `<text class="chart-label" x="${(x + barW / 2).toFixed(1)}" y="${H - 3}" text-anchor="middle">${days[i].getDate()}</text>`;
    }
  });
  svg.innerHTML = markup;

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / 14);
  document.getElementById('earningsSum').textContent = `${sum.toLocaleString('pl-PL')} zł`;
  document.getElementById('earningsAvg').textContent = `${avg.toLocaleString('pl-PL')} zł`;
}

// ---------- rendering: week ----------

const DOW_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

document.getElementById('weekPrev').addEventListener('click', () => {
  weekAnchor = addDays(weekAnchor, -7);
  renderWeek();
});
document.getElementById('weekNext').addEventListener('click', () => {
  const next = addDays(weekAnchor, 7);
  if (next <= startOfWeek(new Date())) {
    weekAnchor = next;
    renderWeek();
  }
});

function renderWeek() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  const label = document.getElementById('weekLabel');
  const fmt = d => `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  label.textContent = `${fmt(days[0])} – ${fmt(days[6])}`;

  const grid = document.getElementById('weekGrid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `1fr repeat(7, 27px)`;

  const todayStr = todayKey();

  grid.appendChild(el('div', 'wg-habit', ''));
  days.forEach(d => {
    const isToday = todayKey(d) === todayStr;
    const cell = el('div', 'wg-head' + (isToday ? ' today' : ''), DOW_LABELS[(d.getDay() + 6) % 7]);
    grid.appendChild(cell);
  });

  CATEGORIES.forEach(cat => {
    const habits = data.habits.filter(h => habitCat(h) === cat.id);
    if (!habits.length) return;
    const groupLabel = el('div', `wg-group ${cat.id}`, cat.label);
    grid.appendChild(groupLabel);

    habits.forEach(h => {
      grid.appendChild(el('div', 'wg-habit', `${h.emoji || ''} ${escapeHtml(h.name)}`));
      days.forEach(d => {
        const key = todayKey(d);
        const isFuture = key > todayStr;
        const day = data.days[key];
        const done = !!(day && day.habits[h.id]);
        const btn = document.createElement('button');
        btn.className = 'wg-cell' + (done ? ` done ${cat.id}` : '') + (isFuture ? ' future' : '');
        btn.textContent = done ? '✓' : '';
        btn.disabled = isFuture;
        btn.addEventListener('click', () => {
          const dd = getDay(key);
          dd.habits[h.id] = !dd.habits[h.id];
          save();
          renderWeek();
        });
        grid.appendChild(btn);
      });
    });
  });

  grid.appendChild(el('div', 'wg-habit', 'Nastrój'));
  days.forEach(d => {
    const key = todayKey(d);
    const day = data.days[key];
    const cell = el('div', 'wg-cell wg-mood', day && day.mood != null ? MOODS[day.mood] : '');
    grid.appendChild(cell);
  });
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  e.className = className;
  e.innerHTML = text;
  return e;
}

// ---------- rendering: stats ----------

function computeBestStreak(habitId) {
  let streak = 0;
  let best = 0;
  let cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = todayKey(cursor);
    const day = data.days[key];
    const done = !!(day && day.habits[habitId]);
    if (done) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
    cursor = addDays(cursor, -1);
  }
  return best;
}

function computeStreak(habitId) {
  return { current: computeCurrentStreak(habitId), best: computeBestStreak(habitId) };
}

function computeCurrentStreak(habitId) {
  let streak = 0;
  let cursor = new Date();
  const todayStr = todayKey();
  const todayDone = !!(data.days[todayStr] && data.days[todayStr].habits[habitId]);
  if (!todayDone) cursor = addDays(cursor, -1);
  for (let i = 0; i < 365; i++) {
    const key = todayKey(cursor);
    const day = data.days[key];
    if (day && day.habits[habitId]) {
      streak++;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}

function renderMoodHistory() {
  const el = document.getElementById('moodHistory');
  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), -(13 - i)));
  el.innerHTML = days.map(d => {
    const key = todayKey(d);
    const day = data.days[key];
    const hasMood = day && day.mood != null;
    const emoji = hasMood ? MOODS[day.mood] : '·';
    return `<div class="mood-history-item"><span class="m ${hasMood ? '' : 'none'}">${emoji}</span><span class="d mono">${d.getDate()}</span></div>`;
  }).join('');
}

function renderStats() {
  const list = document.getElementById('streakList');
  list.innerHTML = '';
  data.habits.forEach(h => {
    const cat = habitCat(h);
    const s = computeStreak(h.id);
    const li = document.createElement('li');
    li.className = `streak-item ${cat}`;
    li.innerHTML = `<span>${h.emoji || ''} ${escapeHtml(h.name)}</span><span class="flame">${s.current} 🔥 <span class="best">(rekord ${s.best})</span></span>`;
    list.appendChild(li);
  });
  if (!data.habits.length) {
    list.innerHTML = '<li class="streak-item">Brak nawyków do śledzenia.</li>';
  }

  const heatmap = document.getElementById('heatmap');
  heatmap.innerHTML = '';
  const cells = [];
  for (let i = 29; i >= 0; i--) {
    const key = todayKey(addDays(new Date(), -i));
    const pct = dayCompletion(key);
    let level = 0;
    if (pct > 0 && pct < 0.5) level = 1;
    else if (pct >= 0.5 && pct < 1) level = 2;
    else if (pct >= 1) level = 3;
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.dataset.level = String(level);
    cell.title = key;
    cells.push(cell);
  }
  cells.forEach(c => heatmap.appendChild(c));

  const last30 = Array.from({ length: 30 }, (_, i) => todayKey(addDays(new Date(), -i)));
  const totalPossible = last30.length * data.habits.length;
  const totalDone = last30.reduce((sum, key) => {
    const day = data.days[key];
    if (!day) return sum;
    return sum + data.habits.filter(h => day.habits[h.id]).length;
  }, 0);
  const avgPct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;

  const activeDays = last30.filter(key => {
    const day = data.days[key];
    return day && Object.values(day.habits).some(Boolean);
  }).length;

  document.getElementById('statGrid').innerHTML = `
    <div class="stat-box"><div class="num">${avgPct}%</div><div class="lbl">śr. realizacja / 30 dni</div></div>
    <div class="stat-box"><div class="num">${activeDays}</div><div class="lbl">aktywnych dni / 30</div></div>
  `;
}

// ---------- rendering: settings ----------

function moveHabit(id, dir) {
  const h = data.habits.find(x => x.id === id);
  if (!h) return;
  const cat = habitCat(h);
  const sameCat = data.habits.filter(x => habitCat(x) === cat);
  const idx = sameCat.findIndex(x => x.id === id);
  const swapIdx = idx + dir;
  if (swapIdx < 0 || swapIdx >= sameCat.length) return;
  const other = sameCat[swapIdx];
  const iA = data.habits.indexOf(h);
  const iB = data.habits.indexOf(other);
  data.habits[iA] = other;
  data.habits[iB] = h;
  save();
  renderSettings();
}

function renderSettings() {
  const list = document.getElementById('habitEditList');
  list.innerHTML = '';
  data.habits.forEach(h => {
    const cat = habitCat(h);
    const sameCat = data.habits.filter(x => habitCat(x) === cat);
    const idx = sameCat.findIndex(x => x.id === h.id);
    const li = document.createElement('li');
    li.className = 'habit-edit-item';
    li.innerHTML = `
      <span class="cat-dot ${cat}" title="${cat === 'health' ? 'Zdrowie' : 'Praca i rozwój'}"></span>
      <div class="reorder-btns">
        <button class="reorder-btn" data-dir="-1" aria-label="Przenieś wyżej" ${idx === 0 ? 'disabled' : ''}>▲</button>
        <button class="reorder-btn" data-dir="1" aria-label="Przenieś niżej" ${idx === sameCat.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <span class="habit-emoji">${h.emoji || '•'}</span>
      <input type="text" value="${escapeHtml(h.name)}" maxlength="60">
      <button class="task-del" aria-label="Usuń">×</button>
    `;
    const input = li.querySelector('input');
    input.addEventListener('change', () => {
      h.name = input.value.trim() || h.name;
      save();
    });
    li.querySelectorAll('.reorder-btn').forEach(btn => {
      btn.addEventListener('click', () => moveHabit(h.id, parseInt(btn.dataset.dir, 10)));
    });
    li.querySelector('.task-del').addEventListener('click', () => {
      if (!confirm(`Usunąć nawyk „${h.name}”? Historia tego nawyku zostanie zachowana, ale przestanie być śledzony.`)) return;
      data.habits = data.habits.filter(x => x.id !== h.id);
      save();
      renderSettings();
    });
    list.appendChild(li);
  });
}

document.getElementById('habitForm').addEventListener('submit', e => {
  e.preventDefault();
  const emojiInput = document.getElementById('habitEmojiInput');
  const nameInput = document.getElementById('habitNameInput');
  const categoryInput = document.getElementById('habitCategoryInput');
  const name = nameInput.value.trim();
  if (!name) return;
  data.habits.push({ id: uid(), emoji: emojiInput.value.trim() || '•', name, category: categoryInput.value });
  emojiInput.value = '';
  nameInput.value = '';
  save();
  renderSettings();
});

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `postep-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.habits || !parsed.days) throw new Error('bad format');
      if (!confirm('To nadpisze obecne dane kopią z pliku. Kontynuować?')) return;
      data = parsed;
      save();
      render();
      alert('Zaimportowano dane.');
    } catch (err) {
      alert('Nie udało się wczytać pliku — sprawdź czy to poprawna kopia zapasowa.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('To usunie WSZYSTKIE dane (nawyki, zadania, nastroje) z tego urządzenia. Tej operacji nie można cofnąć. Kontynuować?')) return;
  if (!confirm('Na pewno? Rozważ wcześniej eksport kopii zapasowej.')) return;
  data = freshData();
  save();
  render();
});

// ---------- main render ----------

function render() {
  renderHeader();
  if (currentView === 'today') {
    renderMood();
    renderEarningsInput();
    renderHabitsToday();
    renderTasks();
  } else if (currentView === 'week') {
    renderWeek();
  } else if (currentView === 'stats') {
    renderStats();
    renderBook();
    renderEarningsChart();
    renderMoodHistory();
  } else if (currentView === 'settings') {
    renderSettings();
  }
}

render();

// ---------- service worker ----------

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
