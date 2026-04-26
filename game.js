// ── Estado ───────────────────────────────────────────────────────────────────
let currentPatient = 0;
let plate = [];          // { id, name, emoji, grams, per100: {carbs,protein,fat,kcal,...} }
let selectedItemId = null;
let searchTimeout  = null;
let plateIdCounter = 0;

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  loadPatient();
  buildQuickGrid();
  setupSearch();
}

// ── Paciente ─────────────────────────────────────────────────────────────────
function loadPatient() {
  const p = PATIENTS[currentPatient];
  document.getElementById('pAvatar').textContent = p.avatar;
  document.getElementById('pName').textContent   = p.name;
  document.getElementById('pGoal').textContent   = p.goal;
  document.getElementById('pBadge').textContent  = `${currentPatient + 1}/${PATIENTS.length}`;
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
  const t2 = PATIENTS[currentPatient].targets;
  document.getElementById('carbTarget').textContent = `meta: ${t2.carbs}%`;
  document.getElementById('protTarget').textContent = `meta: ${t2.protein}%`;
  document.getElementById('fatTarget').textContent  = `meta: ${t2.fat}%`;
}

function updateBarMarkers() {
  const t = PATIENTS[currentPatient].targets;
  document.getElementById('carbMark').style.left = t.carbs   + '%';
  document.getElementById('protMark').style.left = t.protein + '%';
  document.getElementById('fatMark').style.left  = t.fat     + '%';
}

// ── Quick Grid ────────────────────────────────────────────────────────────────
function buildQuickGrid() {
  const grid = document.getElementById('quickGrid');
  grid.innerHTML = '';
  QUICK_FOODS.forEach(food => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.innerHTML = `
      <span class="qb-emoji">${food.emoji}</span>
      <span class="qb-name">${food.label}</span>
    `;
    btn.onclick = () => addFoodToPlate(food.label, food.emoji, food);
    grid.appendChild(btn);
  });
}

// ── Buscador ──────────────────────────────────────────────────────────────────
function setupSearch() {
  const input   = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');
  const clearBtn = document.getElementById('clearBtn');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearBtn.style.display = q.length > 0 ? 'block' : 'none';

    clearTimeout(searchTimeout);
    if (q.length < 2) {
      results.classList.remove('visible');
      results.innerHTML = '';
      return;
    }

    results.classList.add('visible');
    results.innerHTML = '<div class="search-loading">Buscando...</div>';

    searchTimeout = setTimeout(() => doSearch(q), 500);
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-area')) {
      results.classList.remove('visible');
    }
  });
}

async function doSearch(query) {
  const results = document.getElementById('searchResults');
  try {
    const foods = await searchFoods(query);
    if (foods.length === 0) {
      results.innerHTML = '<div class="search-none">Sin resultados. Intenta otro término.</div>';
      return;
    }
    results.innerHTML = '';
    foods.forEach(food => {
      const item = document.createElement('div');
      item.className = 'search-item';
      item.innerHTML = `
        <span class="si-name">${food.name}</span>
        <span class="si-meta">${food.kcal} kcal · C:${food.carbs}g P:${food.protein}g G:${food.fat}g</span>
        <button class="si-add">+ Agregar</button>
      `;
      item.querySelector('.si-add').onclick = (e) => {
        e.stopPropagation();
        addFoodToPlate(food.name, '🍽', food);
        results.classList.remove('visible');
        document.getElementById('searchInput').value = '';
        document.getElementById('clearBtn').style.display = 'none';
      };
      results.appendChild(item);
    });
  } catch(err) {
    results.innerHTML = '<div class="search-none">Error de conexión. Verifica tu internet.</div>';
  }
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('clearBtn').style.display = 'none';
  document.getElementById('searchResults').classList.remove('visible');
  input.focus();
}

// ── Plato ─────────────────────────────────────────────────────────────────────
function addFoodToPlate(name, emoji, per100) {
  const id = ++plateIdCounter;
  plate.push({ id, name, emoji, grams: 100, per100 });
  PlateCanvas.addFood(emoji);
  renderPlate();
  updateAll();
}

function removeFromPlate(id) {
  plate = plate.filter(p => p.id !== id);
  if (selectedItemId === id) {
    selectedItemId = null;
    renderFoodInfo(null);
  }
  PlateCanvas.removeFood();
  renderPlate();
  updateAll();
}

function updateGrams(id, newGrams) {
  const item = plate.find(p => p.id === id);
  if (!item) return;
  const g = Math.max(1, Math.min(2000, parseInt(newGrams) || 0));
  item.grams = g;
  updateAll();
  // Actualizar macros en la fila sin re-render completo
  const row = document.querySelector(`[data-id="${id}"]`);
  if (row) {
    const macroEl = row.querySelector('.pi-macros');
    if (macroEl) macroEl.textContent = buildMacroLine(item);
  }
  if (selectedItemId === id) renderFoodInfo(item);
}

function buildMacroLine(item) {
  const ratio = item.grams / 100;
  const c = (item.per100.carbs   * ratio).toFixed(1);
  const p = (item.per100.protein * ratio).toFixed(1);
  const f = (item.per100.fat     * ratio).toFixed(1);
  const k = Math.round(item.per100.kcal * ratio);
  return `C:${c}g · P:${p}g · G:${f}g · ${k} kcal`;
}

function renderPlate() {
  const list = document.getElementById('plateList');
  document.getElementById('plateCount').textContent =
    plate.length === 0 ? '0 alimentos' : `${plate.length} alimento${plate.length > 1 ? 's' : ''}`;

  if (plate.length === 0) {
    list.innerHTML = `
      <div class="plate-empty">
        <div class="plate-empty-icon">🍽</div>
        <p>El plato está vacío</p>
        <p class="plate-empty-sub">Busca y agrega alimentos arriba</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  plate.forEach(item => {
    const div = document.createElement('div');
    div.className = 'plate-item' + (selectedItemId === item.id ? ' selected' : '');
    div.setAttribute('data-id', item.id);

    div.innerHTML = `
      <span class="pi-emoji">${item.emoji}</span>
      <div class="pi-info">
        <div class="pi-name">${item.name}</div>
        <div class="pi-macros">${buildMacroLine(item)}</div>
      </div>
      <div class="gram-control">
        <button class="gram-btn" onclick="changeGrams(${item.id}, -10)">−</button>
        <input class="gram-input" type="number" min="1" max="2000"
          value="${item.grams}"
          onchange="updateGrams(${item.id}, this.value)"
          onclick="event.stopPropagation()"
        />
        <span class="gram-unit">g</span>
        <button class="gram-btn" onclick="changeGrams(${item.id}, +10)">+</button>
      </div>
      <button class="pi-remove" onclick="removeFromPlate(${item.id})" title="Quitar">×</button>
    `;

    div.addEventListener('click', (e) => {
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
  // Actualizar input visualmente
  const input = document.querySelector(`[data-id="${id}"] .gram-input`);
  if (input) input.value = item.grams;
}

// ── Info detallada de alimento seleccionado ───────────────────────────────────
function renderFoodInfo(item) {
  const box = document.getElementById('foodInfoBox');
  if (!item) {
    box.innerHTML = '<div class="food-info-empty">Selecciona un alimento del plato para ver su detalle</div>';
    return;
  }
  const p = item.per100;
  box.innerHTML = `
    <div class="food-info-name">${item.name}</div>
    <div class="food-info-row">
      <span class="fir-label">Porción</span>
      <span class="fir-val">${item.grams}g</span>
    </div>
    <div class="food-info-row">
      <span class="fir-label">Calorías/100g</span>
      <span class="fir-val">${p.kcal} kcal</span>
    </div>
    <div class="food-info-row">
      <span class="fir-label carbs-color">Carbohidratos</span>
      <span class="fir-val carbs-color">${p.carbs}g</span>
    </div>
    <div class="food-info-row">
      <span class="fir-label prot-color">Proteínas</span>
      <span class="fir-val prot-color">${p.protein}g</span>
    </div>
    <div class="food-info-row">
      <span class="fir-label fat-color">Grasas</span>
      <span class="fir-val fat-color">${p.fat}g</span>
    </div>
    ${p.fiber  !== undefined ? `<div class="food-info-row"><span class="fir-label">Fibra</span><span class="fir-val">${p.fiber}g</span></div>` : ''}
    ${p.sugar  !== undefined ? `<div class="food-info-row"><span class="fir-label">Azúcares</span><span class="fir-val">${p.sugar}g</span></div>` : ''}
    ${p.sodium !== undefined ? `<div class="food-info-row"><span class="fir-label">Sodio</span><span class="fir-val">${p.sodium}g</span></div>` : ''}
  `;
}

// ── Calcular totales ──────────────────────────────────────────────────────────
function getTotals() {
  let carbs = 0, protein = 0, fat = 0, kcal = 0;
  plate.forEach(item => {
    const r = item.grams / 100;
    carbs   += item.per100.carbs   * r;
    protein += item.per100.protein * r;
    fat     += item.per100.fat     * r;
    kcal    += item.per100.kcal    * r;
  });
  return {
    carbs:   parseFloat(carbs.toFixed(1)),
    protein: parseFloat(protein.toFixed(1)),
    fat:     parseFloat(fat.toFixed(1)),
    kcal:    Math.round(kcal)
  };
}

function getPcts(totals) {
  const macroKcal = (totals.carbs * 4) + (totals.protein * 4) + (totals.fat * 9);
  if (macroKcal === 0) return { carbs: 0, protein: 0, fat: 0 };
  return {
    carbs:   Math.round((totals.carbs   * 4 / macroKcal) * 100),
    protein: Math.round((totals.protein * 4 / macroKcal) * 100),
    fat:     Math.round((totals.fat     * 9 / macroKcal) * 100)
  };
}

// ── Actualizar toda la UI ─────────────────────────────────────────────────────
function updateAll() {
  const t   = getTotals();
  const pct = getPcts(t);

  // Sidebar macros
  document.getElementById('carbG').textContent   = t.carbs   + 'g';
  document.getElementById('protG').textContent   = t.protein + 'g';
  document.getElementById('fatG').textContent    = t.fat     + 'g';
  document.getElementById('carbPct').textContent = pct.carbs   + '%';
  document.getElementById('protPct').textContent = pct.protein + '%';
  document.getElementById('fatPct').textContent  = pct.fat     + '%';

  // Barras
  document.getElementById('carbBar').style.width = Math.min(pct.carbs,   100) + '%';
  document.getElementById('protBar').style.width = Math.min(pct.protein, 100) + '%';
  document.getElementById('fatBar').style.width  = Math.min(pct.fat,     100) + '%';

  // Calorías sidebar
  document.getElementById('totalCal').innerHTML = `${t.kcal} <span class="cal-unit">kcal</span>`;

  // Stats derecha
  document.getElementById('stCarbs').textContent     = t.carbs   + 'g';
  document.getElementById('stProt').textContent      = t.protein + 'g';
  document.getElementById('stFat').textContent       = t.fat     + 'g';
  document.getElementById('stCarbsKcal').textContent = Math.round(t.carbs   * 4) + ' kcal';
  document.getElementById('stProtKcal').textContent  = Math.round(t.protein * 4) + ' kcal';
  document.getElementById('stFatKcal').textContent   = Math.round(t.fat     * 9) + ' kcal';

  // Legend derecha
  document.getElementById('lgCarbs').textContent = pct.carbs   + '%';
  document.getElementById('lgProt').textContent  = pct.protein + '%';
  document.getElementById('lgFat').textContent   = pct.fat     + '%';

  // Donut
  document.getElementById('donutCal').textContent = t.kcal;
  updateDonut(pct);
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────
function updateDonut(pct) {
  const r = 46;
  const circ = 2 * Math.PI * r; // ≈ 289.03

  // Segmentos en orden: carbs → protein → fat
  const carbsFrac  = pct.carbs   / 100;
  const protFrac   = pct.protein / 100;
  const fatFrac    = pct.fat     / 100;

  const carbsDash  = circ * carbsFrac;
  const protDash   = circ * protFrac;
  const fatDash    = circ * fatFrac;

  // Carbs empieza en 0 (ya rotado -90° en CSS)
  const carbsOffset = 0;
  const protOffset  = -(carbsDash);
  const fatOffset   = -(carbsDash + protDash);

  const setArc = (el, dash, offset) => {
    el.style.strokeDasharray  = `${dash} ${circ - dash}`;
    el.style.strokeDashoffset = offset;
  };

  setArc(document.getElementById('donutCarbs'), carbsDash, carbsOffset);
  setArc(document.getElementById('donutProt'),  protDash,  protOffset);
  setArc(document.getElementById('donutFat'),   fatDash,   fatOffset);
}

// ── Verificar balance ─────────────────────────────────────────────────────────
function checkBalance() {
  const result = document.getElementById('result');
  const t      = getTotals();

  if (plate.length === 0) {
    showResult('fail', 'Agrega alimentos al plato primero.');
    return;
  }

  const pct     = getPcts(t);
  const targets = PATIENTS[currentPatient].targets;
  const tol     = PATIENTS[currentPatient].tolerance;

  const okCarbs   = Math.abs(pct.carbs   - targets.carbs)   <= tol;
  const okProtein = Math.abs(pct.protein - targets.protein) <= tol;
  const okFat     = Math.abs(pct.fat     - targets.fat)     <= tol;

  if (okCarbs && okProtein && okFat) {
    showResult('success', `✓ ¡Perfecto! ${PATIENTS[currentPatient].name} está satisfecho.`);
    setTimeout(() => {
      currentPatient++;
      if (currentPatient >= PATIENTS.length) {
        showResult('success', '🎉 ¡Completaste los 3 pacientes!');
        setTimeout(() => { currentPatient = 0; resetGame(); loadPatient(); }, 2000);
      } else {
        resetGame();
        loadPatient();
      }
    }, 1400);
  } else {
    const hints = [];
    if (!okCarbs)   hints.push(`carbos ${pct.carbs}% → meta ${targets.carbs}%`);
    if (!okProtein) hints.push(`proteína ${pct.protein}% → meta ${targets.protein}%`);
    if (!okFat)     hints.push(`grasas ${pct.fat}% → meta ${targets.fat}%`);
    showResult('fail', 'Ajusta: ' + hints.join(' · '));
  }
}

function showResult(type, msg) {
  const el = document.getElementById('result');
  el.className = 'result-box ' + type;
  el.textContent = msg;
  el.style.display = 'block';
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function resetGame() {
  plate = [];
  selectedItemId = null;
  PlateCanvas.clearFoods();
  renderPlate();
  updateAll();
  renderFoodInfo(null);
  document.getElementById('result').style.display = 'none';
}

// ── Arrancar ──────────────────────────────────────────────────────────────────
init();
updateDonut({ carbs: 0, protein: 0, fat: 0 });