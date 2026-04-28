// ══════════════════════════════════════════════════════════════════
//  NutriBalance Pro — game.js
//  Mecánicas: temporizador · humor del paciente · puntos + XP
// ══════════════════════════════════════════════════════════════════

const LEVELS = [
  { name: 'Junior',   xpNeeded: 100  },
  { name: 'Aprendiz', xpNeeded: 250  },
  { name: 'Experto',  xpNeeded: 500  },
  { name: 'Senior',   xpNeeded: 900  },
  { name: 'Master',   xpNeeded: 99999 }
];

const TIMER_SECONDS  = 60;
const CIRCUMFERENCE  = 163.4;

// ── Estado ────────────────────────────────────────────────────────
let currentPatient = 0;
let plate          = [];
let selectedItemId = null;
let searchTimeout  = null;
let plateIdCounter = 0;

let score         = 0;
let xp            = 0;
let level         = 0;
let streak        = 1;
let timerSec      = TIMER_SECONDS;
let timerInterval = null;
let gameOver      = false;
let paused        = false;
let timerMode     = true;   // true = con tiempo, false = libre

// ── Init ──────────────────────────────────────────────────────────
function init() {
  loadPatient();
  buildQuickGrid();
  setupSearch();
  // El timer arranca cuando el jugador cierra el modal de bienvenida
}

function closeWelcome(withTimer) {
  timerMode = withTimer;
  document.getElementById('welcomeModal').classList.remove('visible');
  const tw = document.getElementById('timerWrap');
  const pb = document.getElementById('pauseBtn');
  const rb = document.getElementById('resetTimerBtn');
  if (!timerMode) {
    tw.classList.add('hidden');
    if (pb) pb.style.display = 'none';
    if (rb) rb.style.display = 'none';
  } else {
    tw.classList.remove('hidden');
    startTimer();
  }
}

// ── Paciente ──────────────────────────────────────────────────────
function loadPatient() {
  const p = PATIENTS[currentPatient];
  document.getElementById('pAvatar').textContent = p.avatar;
  document.getElementById('pName').textContent   = p.name;
  document.getElementById('pGoal').textContent   = p.goal;
  setMood('neutral');
  buildSteps();
  buildTargets();
  updateBarMarkers();
}

function buildSteps() {
  const c = document.getElementById('patientSteps');
  c.innerHTML = '';
  PATIENTS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'step-dot' + (i < currentPatient ? ' done' : i === currentPatient ? ' active' : '');
    c.appendChild(d);
  });
}

function buildTargets() {
  const t = PATIENTS[currentPatient].targets;
  document.getElementById('targetsGrid').innerHTML = `
    <div class="target-chip">
      <div class="tc-label">Carbs</div>
      <div class="tc-val carbs-color">${t.carbs}%</div>
    </div>
    <div class="target-chip">
      <div class="tc-label">Prot</div>
      <div class="tc-val prot-color">${t.protein}%</div>
    </div>
    <div class="target-chip">
      <div class="tc-label">Grasas</div>
      <div class="tc-val fat-color">${t.fat}%</div>
    </div>
  `;
  document.getElementById('carbTarget').textContent = 'meta: ' + t.carbs   + '%';
  document.getElementById('protTarget').textContent = 'meta: ' + t.protein + '%';
  document.getElementById('fatTarget').textContent  = 'meta: ' + t.fat     + '%';
}

function updateBarMarkers() {
  const t = PATIENTS[currentPatient].targets;
  document.getElementById('carbMark').style.left = t.carbs   + '%';
  document.getElementById('protMark').style.left = t.protein + '%';
  document.getElementById('fatMark').style.left  = t.fat     + '%';
}

// ── Humor del paciente ────────────────────────────────────────────
const MOODS = { happy: '😄', neutral: '😐', worried: '😟', angry: '😠', love: '🥰' };

function setMood(mood) {
  const el = document.getElementById('pMood');
  el.textContent = MOODS[mood] || MOODS.neutral;
  el.classList.remove('bounce');
  void el.offsetWidth;
  el.classList.add('bounce');
}

function updateMood() {
  if (plate.length === 0) { setMood('neutral'); return; }
  const pct  = getPcts(getTotals());
  const t    = PATIENTS[currentPatient].targets;
  const tol  = PATIENTS[currentPatient].tolerance;
  const avg  = (Math.abs(pct.carbs - t.carbs) + Math.abs(pct.protein - t.protein) + Math.abs(pct.fat - t.fat)) / 3;
  if (avg <= 5)        setMood('love');
  else if (avg <= tol) setMood('happy');
  else if (avg <= 20)  setMood('worried');
  else                 setMood('angry');
}

// ── Temporizador ──────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  timerSec = TIMER_SECONDS;
  gameOver = false;
  paused   = false;
  setPauseUI(false);
  renderTimer();
  if (!timerMode) return;
  timerInterval = setInterval(() => {
    timerSec--;
    renderTimer();
    updateTimerSub();
    if (timerSec <= 0) { stopTimer(); onTimeOut(); }
  }, 1000);
}


// ── Pausa ─────────────────────────────────────────────────────────
function togglePause() {
  if (gameOver) return;
  paused = !paused;
  setPauseUI(paused);

  if (paused) {
    stopTimer();
  } else {
    // Reanudar: reiniciar el interval sin resetear timerSec
    timerInterval = setInterval(() => {
      timerSec--;
      renderTimer();
      updateTimerSub();
      if (timerSec <= 0) { stopTimer(); onTimeOut(); }
    }, 1000);
  }
}

function setPauseUI(isPaused) {
  const btn     = document.getElementById('pauseBtn');
  const overlay = document.getElementById('pauseOverlay');
  if (!btn || !overlay) return;
  btn.textContent = isPaused ? '▶' : '⏸';
  btn.classList.toggle('paused', isPaused);
  overlay.classList.toggle('visible', isPaused);
}

function resetTimer() {
  if (!timerMode || gameOver) return;
  startTimer();
  showFloatNotif('⏱ Tiempo reiniciado');
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function renderTimer() {
  document.getElementById('timerNum').textContent = timerSec;
  const frac = timerSec / TIMER_SECONDS;
  const arc  = document.getElementById('timerArc');
  arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
  const urgent = timerSec <= 15;
  document.getElementById('timerWrap').classList.toggle('urgent', urgent);
  arc.classList.toggle('urgent', urgent);
}

function updateTimerSub() {
  const sub = document.getElementById('timerSub');
  if (timerSec > 40)      sub.textContent = '¡Arma el plato!';
  else if (timerSec > 20) sub.textContent = 'Vas bien, ajusta';
  else if (timerSec > 10) sub.textContent = '⚠️ ¡Apúrate!';
  else                    sub.textContent = '🔥 ¡Último momento!';
}

function onTimeOut() {
  if (!timerMode) return;
  gameOver = true;
  streak   = 1;
  updateStreakDisplay();
  const lost = Math.round(score * 0.1);
  score = Math.max(0, score - lost);
  updateScoreDisplay();
  document.getElementById('timeoutPoints').textContent = lost > 0 ? '-' + lost + ' puntos' : 'Sin penalización';
  document.getElementById('timeoutModal').classList.add('visible');
}

// ── Puntos y XP ───────────────────────────────────────────────────
function addPoints(base) {
  const timeBonus   = Math.round((timerSec / TIMER_SECONDS) * base * 0.5);
  const streakBonus = Math.round(base * (streak - 1) * 0.2);
  const total = base + timeBonus + streakBonus;
  score += total;
  xp    += Math.round(total * 0.6);
  updateScoreDisplay();
  checkLevelUp();
  showFloatNotif('+' + total + ' pts');
  return { base, timeBonus, streakBonus, total };
}

function updateScoreDisplay() {
  document.getElementById('scoreVal').textContent = score.toLocaleString();
}

function updateStreakDisplay() {
  document.getElementById('streakVal').textContent = 'x' + streak;
}

function checkLevelUp() {
  const lvl = LEVELS[level];
  if (!lvl) return;
  const pct = Math.min(100, Math.round((xp / lvl.xpNeeded) * 100));
  document.getElementById('xpBar').style.width   = pct + '%';
  document.getElementById('xpLabel').textContent = xp + ' / ' + lvl.xpNeeded + ' XP';
  if (xp >= lvl.xpNeeded && level < LEVELS.length - 1) {
    level++;
    xp = 0;
    document.getElementById('levelVal').textContent  = 'Nv.' + (level + 1);
    document.getElementById('levelName').textContent = LEVELS[level].name;
    showFloatNotif('🎖 ¡Subiste a ' + LEVELS[level].name + '!');
  }
}

function showFloatNotif(msg) {
  const el = document.getElementById('floatNotif');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

// ── Quick Grid ────────────────────────────────────────────────────
function buildQuickGrid() {
  const grid = document.getElementById('quickGrid');
  grid.innerHTML = '';
  QUICK_FOODS.forEach(food => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.innerHTML = '<span class="qb-emoji">' + food.emoji + '</span><span class="qb-name">' + food.label + '</span>';
    btn.onclick = () => addFoodToPlate(food.label, food.emoji, food);
    grid.appendChild(btn);
  });
}

// ── Buscador ──────────────────────────────────────────────────────
function setupSearch() {
  const input    = document.getElementById('searchInput');
  const results  = document.getElementById('searchResults');
  const clearBtn = document.getElementById('clearBtn');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q.length > 0 ? 'block' : 'none';
    clearTimeout(searchTimeout);
    if (q.length < 2) { results.classList.remove('visible'); results.innerHTML = ''; return; }
    results.classList.add('visible');
    results.innerHTML = '<div class="search-loading">Buscando...</div>';
    searchTimeout = setTimeout(() => doSearch(q), 500);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-area')) results.classList.remove('visible');
  });
}

async function doSearch(query) {
  const results = document.getElementById('searchResults');
  try {
    const foods = await searchFoods(query);
    if (foods.length === 0) { results.innerHTML = '<div class="search-none">Sin resultados.</div>'; return; }
    results.innerHTML = '';
    foods.forEach(food => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = '<span class="si-name">' + food.name + '</span><span class="si-meta">' + food.kcal + ' kcal · C:' + food.carbs + 'g P:' + food.protein + 'g G:' + food.fat + 'g</span><button class="si-add">+ Agregar</button>';
      item.querySelector('.si-add').onclick = e => {
        e.stopPropagation();
        addFoodToPlate(food.name, '🍽', food);
        results.classList.remove('visible');
        document.getElementById('searchInput').value = '';
        document.getElementById('clearBtn').style.display = 'none';
      };
      results.appendChild(item);
    });
  } catch { results.innerHTML = '<div class="search-none">Error de conexión.</div>'; }
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('searchResults').classList.remove('visible');
  document.getElementById('searchInput').focus();
}

// ── Plato ─────────────────────────────────────────────────────────
function addFoodToPlate(name, emoji, per100) {
  if (gameOver || paused) return;
  const id = ++plateIdCounter;
  plate.push({ id, name, emoji, grams: 100, per100 });
  PlateCanvas.addFood(emoji);
  renderPlate();
  updateAll();
  updateMood();
}

function removeFromPlate(id) {
  plate = plate.filter(p => p.id !== id);
  if (selectedItemId === id) { selectedItemId = null; renderFoodInfo(null); }
  PlateCanvas.removeFood();
  renderPlate();
  updateAll();
  updateMood();
}

function updateGrams(id, newGrams) {
  const item = plate.find(p => p.id === id);
  if (!item) return;
  item.grams = Math.max(1, Math.min(2000, parseInt(newGrams) || 0));
  updateAll();
  updateMood();
  const row = document.querySelector('[data-id="' + id + '"]');
  if (row) row.querySelector('.pi-macros').textContent = buildMacroLine(item);
  if (selectedItemId === id) renderFoodInfo(item);
}

function buildMacroLine(item) {
  const r = item.grams / 100;
  return 'C:' + (item.per100.carbs * r).toFixed(1) + 'g · P:' + (item.per100.protein * r).toFixed(1) + 'g · G:' + (item.per100.fat * r).toFixed(1) + 'g · ' + Math.round(item.per100.kcal * r) + ' kcal';
}

function renderPlate() {
  const list = document.getElementById('plateList');
  document.getElementById('plateCount').textContent = plate.length === 0 ? '0 alimentos' : plate.length + ' alimento' + (plate.length > 1 ? 's' : '');

  if (plate.length === 0) {
    list.innerHTML = '<div class="plate-empty"><div class="plate-empty-icon">🍽</div><p>El plato está vacío</p><p class="plate-empty-sub">Busca y agrega alimentos arriba</p></div>';
    return;
  }

  list.innerHTML = '';
  plate.forEach(item => {
    const div = document.createElement('div');
    div.className = 'plate-item' + (selectedItemId === item.id ? ' selected' : '');
    div.setAttribute('data-id', item.id);
    div.innerHTML = '<span class="pi-emoji">' + item.emoji + '</span><div class="pi-info"><div class="pi-name">' + item.name + '</div><div class="pi-macros">' + buildMacroLine(item) + '</div></div><div class="gram-control"><button class="gram-btn" onclick="changeGrams(' + item.id + ', -10)">−</button><input class="gram-input" type="number" min="1" max="2000" value="' + item.grams + '" onchange="updateGrams(' + item.id + ', this.value)" onclick="event.stopPropagation()"/><span class="gram-unit">g</span><button class="gram-btn" onclick="changeGrams(' + item.id + ', +10)">+</button></div><button class="pi-remove" onclick="removeFromPlate(' + item.id + ')">×</button>';
    div.addEventListener('click', e => {
      if (e.target.closest('.gram-control') || e.target.closest('.pi-remove')) return;
      selectedItemId = selectedItemId === item.id ? null : item.id;
      renderPlate();
      renderFoodInfo(selectedItemId === item.id ? item : null);
    });
    list.appendChild(div);
  });
}

function changeGrams(id, delta) {
  const item = plate.find(p => p.id === id);
  if (!item) return;
  updateGrams(id, item.grams + delta);
  const input = document.querySelector('[data-id="' + id + '"] .gram-input');
  if (input) input.value = item.grams;
}

function renderFoodInfo(item) {
  const box = document.getElementById('foodInfoBox');
  if (!item) { box.innerHTML = '<div class="food-info-empty">Selecciona un alimento del plato para ver su detalle</div>'; return; }
  const p = item.per100;
  box.innerHTML = '<div class="food-info-name">' + item.name + '</div>'
    + '<div class="food-info-row"><span class="fir-label">Porción</span><span class="fir-val">' + item.grams + 'g</span></div>'
    + '<div class="food-info-row"><span class="fir-label">Calorías/100g</span><span class="fir-val">' + p.kcal + ' kcal</span></div>'
    + '<div class="food-info-row"><span class="fir-label carbs-color">Carbohidratos</span><span class="fir-val carbs-color">' + p.carbs + 'g</span></div>'
    + '<div class="food-info-row"><span class="fir-label prot-color">Proteínas</span><span class="fir-val prot-color">' + p.protein + 'g</span></div>'
    + '<div class="food-info-row"><span class="fir-label fat-color">Grasas</span><span class="fir-val fat-color">' + p.fat + 'g</span></div>'
    + (p.fiber  ? '<div class="food-info-row"><span class="fir-label">Fibra</span><span class="fir-val">' + p.fiber + 'g</span></div>' : '')
    + (p.sugar  ? '<div class="food-info-row"><span class="fir-label">Azúcares</span><span class="fir-val">' + p.sugar + 'g</span></div>' : '')
    + (p.sodium ? '<div class="food-info-row"><span class="fir-label">Sodio</span><span class="fir-val">' + p.sodium + 'g</span></div>' : '');
}

// ── Totales ───────────────────────────────────────────────────────
function getTotals() {
  let carbs = 0, protein = 0, fat = 0, kcal = 0;
  plate.forEach(item => {
    const r = item.grams / 100;
    carbs   += item.per100.carbs   * r;
    protein += item.per100.protein * r;
    fat     += item.per100.fat     * r;
    kcal    += item.per100.kcal    * r;
  });
  return { carbs: parseFloat(carbs.toFixed(1)), protein: parseFloat(protein.toFixed(1)), fat: parseFloat(fat.toFixed(1)), kcal: Math.round(kcal) };
}

function getPcts(totals) {
  const mk = (totals.carbs * 4) + (totals.protein * 4) + (totals.fat * 9);
  if (mk === 0) return { carbs: 0, protein: 0, fat: 0 };
  return { carbs: Math.round((totals.carbs * 4 / mk) * 100), protein: Math.round((totals.protein * 4 / mk) * 100), fat: Math.round((totals.fat * 9 / mk) * 100) };
}

// ── Actualizar UI ─────────────────────────────────────────────────
function updateAll() {
  const t = getTotals(), pct = getPcts(t);
  document.getElementById('carbG').textContent   = t.carbs   + 'g';
  document.getElementById('protG').textContent   = t.protein + 'g';
  document.getElementById('fatG').textContent    = t.fat     + 'g';
  document.getElementById('carbPct').textContent = pct.carbs   + '%';
  document.getElementById('protPct').textContent = pct.protein + '%';
  document.getElementById('fatPct').textContent  = pct.fat     + '%';
  document.getElementById('carbBar').style.width = Math.min(pct.carbs,   100) + '%';
  document.getElementById('protBar').style.width = Math.min(pct.protein, 100) + '%';
  document.getElementById('fatBar').style.width  = Math.min(pct.fat,     100) + '%';
  document.getElementById('totalCal').innerHTML  = t.kcal + ' <span class="cal-unit">kcal</span>';
  document.getElementById('stCarbs').textContent     = t.carbs   + 'g';
  document.getElementById('stProt').textContent      = t.protein + 'g';
  document.getElementById('stFat').textContent       = t.fat     + 'g';
  document.getElementById('stCarbsKcal').textContent = Math.round(t.carbs   * 4) + ' kcal';
  document.getElementById('stProtKcal').textContent  = Math.round(t.protein * 4) + ' kcal';
  document.getElementById('stFatKcal').textContent   = Math.round(t.fat     * 9) + ' kcal';
  document.getElementById('lgCarbs').textContent = pct.carbs   + '%';
  document.getElementById('lgProt').textContent  = pct.protein + '%';
  document.getElementById('lgFat').textContent   = pct.fat     + '%';
  document.getElementById('donutCal').textContent = t.kcal;
  updateDonut(pct);
}

function updateDonut(pct) {
  const circ = 2 * Math.PI * 46;
  const cD = circ * (pct.carbs   / 100);
  const pD = circ * (pct.protein / 100);
  const fD = circ * (pct.fat     / 100);
  const set = (id, dash, offset) => {
    const el = document.getElementById(id);
    el.style.strokeDasharray  = dash + ' ' + (circ - dash);
    el.style.strokeDashoffset = offset;
  };
  set('donutCarbs', cD, 0);
  set('donutProt',  pD, -cD);
  set('donutFat',   fD, -(cD + pD));
}

// ── Verificar balance ─────────────────────────────────────────────
function checkBalance() {
  if (gameOver) return;
  if (plate.length === 0) { showResult('fail', 'Agrega alimentos al plato primero.'); return; }

  const t       = getTotals();
  const pct     = getPcts(t);
  const targets = PATIENTS[currentPatient].targets;
  const tol     = PATIENTS[currentPatient].tolerance;
  const ok      = Math.abs(pct.carbs - targets.carbs) <= tol && Math.abs(pct.protein - targets.protein) <= tol && Math.abs(pct.fat - targets.fat) <= tol;

  if (ok) {
    stopTimer();
    streak++;
    updateStreakDisplay();
    const earned = addPoints(100);
    setMood('love');

    const isLast = currentPatient >= PATIENTS.length - 1;
    document.getElementById('modalEmoji').textContent = isLast ? '🏆' : '🎉';
    document.getElementById('modalTitle').textContent = isLast ? '¡Todos los pacientes atendidos!' : PATIENTS[currentPatient].name + ' satisfecho';
    document.getElementById('modalSub').textContent   = 'Tiempo restante: ' + timerSec + 's · Racha: x' + (streak - 1);
    document.getElementById('modalPoints').textContent = '+' + earned.total + ' puntos';
    document.getElementById('modalStats').innerHTML =
      '<div class="mstat"><div class="mstat-val carbs-color">' + t.carbs + 'g</div><div class="mstat-label">Carbos</div></div>'
      + '<div class="mstat"><div class="mstat-val prot-color">' + t.protein + 'g</div><div class="mstat-label">Proteína</div></div>'
      + '<div class="mstat"><div class="mstat-val fat-color">' + t.fat + 'g</div><div class="mstat-label">Grasas</div></div>'
      + '<div class="mstat"><div class="mstat-val">' + t.kcal + '</div><div class="mstat-label">kcal</div></div>';

    const btn = document.getElementById('modalBtn');
    if (isLast) { btn.textContent = '🔄 Jugar de nuevo'; btn.onclick = () => { closeModal(); fullReset(); }; }
    else        { btn.textContent = 'Ver dato nutricional →'; btn.onclick = () => { closeModal(); showFactModal(); }; }

    document.getElementById('successModal').classList.add('visible');
  } else {
    streak = 1;
    updateStreakDisplay();
    setMood('angry');
    const hints = [];
    if (Math.abs(pct.carbs   - targets.carbs)   > tol) hints.push('carbos '   + pct.carbs   + '% → meta ' + targets.carbs   + '%');
    if (Math.abs(pct.protein - targets.protein) > tol) hints.push('proteína ' + pct.protein + '% → meta ' + targets.protein + '%');
    if (Math.abs(pct.fat     - targets.fat)     > tol) hints.push('grasas '   + pct.fat     + '% → meta ' + targets.fat     + '%');
    showResult('fail', '✗ Ajusta: ' + hints.join(' · '));
  }
}

function showResult(type, msg) {
  const el = document.getElementById('result');
  el.className = 'result-box ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Modales ───────────────────────────────────────────────────────
function closeModal() {
  document.getElementById('successModal').classList.remove('visible');
  currentPatient++;
  currentPatient >= PATIENTS.length ? fullReset() : resetRound();
}

function closeTimeoutModal() {
  document.getElementById('timeoutModal').classList.remove('visible');
  resetRound();
}

// ── Reset ─────────────────────────────────────────────────────────
function resetRound() {
  plate = []; selectedItemId = null; gameOver = false;
  PlateCanvas.clearFoods();
  renderPlate(); updateAll(); renderFoodInfo(null);
  document.getElementById('result').style.display = 'none';
  loadPatient();
  if (timerMode) startTimer();
}

function fullReset() {
  currentPatient = 0; score = 0; xp = 0; level = 0; streak = 1;
  updateScoreDisplay(); updateStreakDisplay();
  document.getElementById('levelVal').textContent  = 'Nv.1';
  document.getElementById('levelName').textContent = LEVELS[0].name;
  document.getElementById('xpBar').style.width     = '0%';
  document.getElementById('xpLabel').textContent   = '0 / 100 XP';
  resetRound();
}

function resetGame() {
  stopTimer(); streak = 1; updateStreakDisplay(); resetRound();
}

// ── Arrancar ──────────────────────────────────────────────────────
init();
updateDonut({ carbs: 0, protein: 0, fat: 0 });

// ── Alimento personalizado (panel fijo) ──────────────────────────
function toggleAddFood() {
  const body  = document.getElementById('afpBody');
  const arrow = document.getElementById('afpArrow');
  const open  = body.classList.toggle('open');
  arrow.classList.toggle('open', open);
  if (open) {
    // Limpiar al abrir
    ['cf-name','cf-emoji','cf-carbs','cf-protein','cf-fat','cf-kcal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('cfPreview').style.display = 'none';
  }
}

function updateFoodPreview() {
  const name    = document.getElementById('cf-name').value.trim();
  const emoji   = document.getElementById('cf-emoji').value.trim() || '🍽';
  const carbs   = parseFloat(document.getElementById('cf-carbs').value)   || 0;
  const protein = parseFloat(document.getElementById('cf-protein').value) || 0;
  const fat     = parseFloat(document.getElementById('cf-fat').value)     || 0;
  const kcal    = parseFloat(document.getElementById('cf-kcal').value)    || Math.round(carbs*4 + protein*4 + fat*9);

  const preview = document.getElementById('cfPreview');
  if (!name) { preview.style.display = 'none'; return; }

  preview.style.display = 'flex';
  document.getElementById('fpEmoji').textContent  = emoji;
  document.getElementById('fpName').textContent   = name;
  document.getElementById('fpMacros').textContent = 'C:' + carbs + 'g P:' + protein + 'g G:' + fat + 'g · ' + kcal + ' kcal';
}

function saveCustomFood() {
  const name    = document.getElementById('cf-name').value.trim();
  const emoji   = document.getElementById('cf-emoji').value.trim() || '🍽';
  const carbs   = parseFloat(document.getElementById('cf-carbs').value)   || 0;
  const protein = parseFloat(document.getElementById('cf-protein').value) || 0;
  const fat     = parseFloat(document.getElementById('cf-fat').value)     || 0;
  const kcalIn  = parseFloat(document.getElementById('cf-kcal').value);
  const kcal    = kcalIn || Math.round(carbs*4 + protein*4 + fat*9);

  if (!name) { showFloatNotif('⚠ Ingresá un nombre'); return; }
  if (carbs === 0 && protein === 0 && fat === 0) { showFloatNotif('⚠ Ingresá al menos un macro'); return; }

  const food = { carbs, protein, fat, kcal };
  // Cerrar panel
  document.getElementById('afpBody').classList.remove('open');
  document.getElementById('afpArrow').classList.remove('open');
  addFoodToPlate(name, emoji, food);

  // También guardar en accesos rápidos temporalmente
  const key = 'custom_' + Date.now();
  QUICK_FOODS.unshift({ key, emoji, label: name.length > 10 ? name.substring(0,10)+'…' : name, carbs, protein, fat, kcal });
  buildQuickGrid();
  showFloatNotif('✓ ' + name + ' agregado');
}

// ── Modal dato nutricional ────────────────────────────────────────
function showFactModal() {
  const factData = PATIENT_FACTS[currentPatient - 1];
  if (!factData) { resetRound(); return; }

  // Crear modal dinámicamente si no existe
  let modal = document.getElementById('factModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'factModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = '<div class="modal-box modal-box--fact">'
    + '<div class="fact-header">'
    + '<span class="fact-badge">💡 Dato nutricional</span>'
    + '</div>'
    + '<div class="fact-title">' + factData.title + '</div>'
    + '<div class="fact-list">'
    + factData.facts.map(f => '<div class="fact-item">' + f + '</div>').join('')
    + '</div>'
    + '<button class="modal-btn" onclick="closeFactModal()">Siguiente paciente →</button>'
    + '</div>';

  modal.classList.add('visible');
}

function closeFactModal() {
  const modal = document.getElementById('factModal');
  if (modal) modal.classList.remove('visible');
  resetRound();
}