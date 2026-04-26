// ── PlateCanvas: Motor de animación Canvas 2D ────────────────────────────────
// Dibuja un plato real con física simple:
// - Los alimentos caen desde arriba con gravedad
// - Rebotan al llegar al plato
// - Se acumulan y se acomodan en el área del plato

const PlateCanvas = (() => {

  // ── Config ────────────────────────────────────────────────────────────────
  const CFG = {
    W:         440,    // ancho canvas
    H:         300,    // alto canvas
    PLATE_CX:  220,    // centro X del plato
    PLATE_CY:  210,    // centro Y del plato
    PLATE_RX:  160,    // radio horizontal (elipse)
    PLATE_RY:  36,     // radio vertical (elipse = efecto 3D)
    PLATE_RIM: 12,     // grosor del borde del plato
    GRAVITY:   0.55,
    BOUNCE:    0.38,
    FRICTION:  0.82,
    FOOD_SIZE: 34,     // tamaño emoji
    MAX_FOODS: 14,     // máximo visible en canvas
  };

  // ── Estado interno ────────────────────────────────────────────────────────
  let canvas, ctx;
  let foods   = [];   // { emoji, x, y, vy, vx, angle, va, landed, scale, alpha, targetX, targetY }
  let rafId   = null;
  let plateGlow = 0;  // efecto glow al agregar

  // Zona de aterrizaje: puntos distribuidos en la elipse del plato
  const LANDING_SLOTS = generateSlots();

  function generateSlots() {
    const slots = [];
    const rings = [
      { r: 0.15, count: 1  },
      { r: 0.40, count: 5  },
      { r: 0.72, count: 8  },
    ];
    rings.forEach(({ r, count }) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        slots.push({
          x: CFG.PLATE_CX + Math.cos(angle) * CFG.PLATE_RX * r * 0.85,
          y: CFG.PLATE_CY - CFG.PLATE_RY * 0.3 + Math.sin(angle) * CFG.PLATE_RY * r * 0.5
        });
      }
    });
    return slots;
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    canvas = document.getElementById('plateCanvas');
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      const wrap  = canvas.parentElement;
      const availW = Math.min(wrap.clientWidth - 20, 340);
      const scale  = availW / CFG.W;
      canvas.width  = CFG.W;
      canvas.height = CFG.H;
      canvas.style.width  = availW + 'px';
      canvas.style.height = Math.round(CFG.H * scale) + 'px';
    } else {
      canvas.width  = CFG.W;
      canvas.height = CFG.H;
    }
    ctx = canvas.getContext('2d');
    loop();
  }

  // ── Agregar alimento ──────────────────────────────────────────────────────
  function addFood(emoji) {
    // Si hay demasiados, quitar el más viejo
    if (foods.length >= CFG.MAX_FOODS) foods.shift();

    const slotIdx  = foods.length % LANDING_SLOTS.length;
    const slot     = LANDING_SLOTS[slotIdx];

    // pequeño offset aleatorio para que no queden perfectos
    const jitterX = (Math.random() - 0.5) * 30;
    const jitterY = (Math.random() - 0.5) * 10;

    foods.push({
      emoji,
      x:       CFG.PLATE_CX + (Math.random() - 0.5) * 60,  // posición inicial X
      y:       -CFG.FOOD_SIZE,                               // empieza arriba del canvas
      vx:      (Math.random() - 0.5) * 2,
      vy:      Math.random() * 2 + 1,
      angle:   (Math.random() - 0.5) * 0.8,
      va:      (Math.random() - 0.5) * 0.08,
      landed:  false,
      bounces: 0,
      scale:   1,
      alpha:   1,
      targetX: slot.x + jitterX,
      targetY: slot.y + jitterY,
    });

    plateGlow = 1.0;  // trigger glow
  }

  // ── Quitar alimento ───────────────────────────────────────────────────────
  function removeFood(index) {
    // Animar desaparición del último en esa posición
    if (foods.length > 0) {
      // marcar el último como saliendo
      const f = foods[foods.length - 1];
      f.leaving = true;
    }
    setTimeout(() => {
      if (foods.length > 0) foods.pop();
    }, 300);
  }

  function clearFoods() {
    // Todos se van volando
    foods.forEach(f => { f.leaving = true; f.vy = -6; f.vx = (Math.random()-0.5)*8; });
    setTimeout(() => { foods = []; }, 600);
  }

  // ── Loop de animación ─────────────────────────────────────────────────────
  function loop() {
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function update() {
    plateGlow = Math.max(0, plateGlow - 0.025);

    foods.forEach(f => {
      if (f.leaving) {
        f.vy -= 0.4;
        f.vx *= 1.05;
        f.y  += f.vy;
        f.x  += f.vx;
        f.alpha = Math.max(0, f.alpha - 0.06);
        f.scale = Math.max(0, f.scale - 0.04);
        return;
      }

      if (!f.landed) {
        // Física de caída
        f.vy += CFG.GRAVITY;
        f.y  += f.vy;
        f.x  += f.vx;
        f.angle += f.va;

        // Chequear si llegó cerca del target Y
        if (f.y >= f.targetY) {
          f.y  = f.targetY;
          f.vy = -Math.abs(f.vy) * CFG.BOUNCE;
          f.vx *= CFG.FRICTION;
          f.va *= 0.5;
          f.bounces++;

          // Deslizar hacia target X
          f.x += (f.targetX - f.x) * 0.3;

          if (Math.abs(f.vy) < 0.8 && f.bounces >= 2) {
            f.landed = true;
            f.y      = f.targetY;
            f.x      = f.targetX;
            f.angle  = 0;
            f.vy     = 0;
            f.vx     = 0;
          }
        }

        // Deslizar X hacia target mientras cae
        if (!f.landed) {
          f.x += (f.targetX - f.x) * 0.05;
        }

      } else {
        // Ya aterrizó, pequeña animación de "respiración"
        f.scale = 1 + Math.sin(Date.now() * 0.002 + f.targetX) * 0.015;
      }
    });
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw() {
    ctx.clearRect(0, 0, CFG.W, CFG.H);

    drawPlate();
    drawFoodsBelow();  // alimentos "dentro" del plato (detrás del borde)
    drawPlateBorder();
    drawFoodsAbove();  // alimentos encima del borde
  }

  function drawPlate() {
    const cx = CFG.PLATE_CX, cy = CFG.PLATE_CY;
    const rx = CFG.PLATE_RX, ry = CFG.PLATE_RY;

    // Sombra del plato
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur  = 30;
    ctx.shadowOffsetY = 10;

    // Base del plato (elipse blanca/gris)
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const plateGrad = ctx.createRadialGradient(cx, cy - ry * 0.3, 0, cx, cy, rx);
    plateGrad.addColorStop(0,   '#2a2a35');
    plateGrad.addColorStop(0.7, '#1e1e28');
    plateGrad.addColorStop(1,   '#16161f');
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.restore();

    // Glow al agregar alimento
    if (plateGlow > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 8, ry + 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(62, 207, 142, ${plateGlow * 0.6})`;
      ctx.lineWidth   = 3 + plateGlow * 4;
      ctx.shadowColor = `rgba(62, 207, 142, ${plateGlow * 0.8})`;
      ctx.shadowBlur  = 20;
      ctx.stroke();
      ctx.restore();
    }

    // Línea interna decorativa
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.85, ry * 0.85, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawPlateBorder() {
    const cx = CFG.PLATE_CX, cy = CFG.PLATE_CY;
    const rx = CFG.PLATE_RX, ry = CFG.PLATE_RY;
    const rim = CFG.PLATE_RIM;

    // Borde exterior (3D top highlight)
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);  // mitad de arriba
    const rimGrad = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    rimGrad.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth   = rim;
    ctx.stroke();

    // Borde inferior (sombra)
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = rim * 0.6;
    ctx.stroke();

    // Borde continuo exterior
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  }

  // Los alimentos en la mitad "trasera" del plato (y < plateCY)
  function drawFoodsBelow() {
    foods.forEach(f => {
      if (f.y < CFG.PLATE_CY - 2) drawEmoji(f);
    });
  }

  // Los alimentos en la mitad "delantera" (y >= plateCY)
  function drawFoodsAbove() {
    foods.forEach(f => {
      if (f.y >= CFG.PLATE_CY - 2) drawEmoji(f);
    });
  }

  function drawEmoji(f) {
    if (f.alpha <= 0 || f.scale <= 0) return;
    const size = CFG.FOOD_SIZE * f.scale;
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    // Sombra del emoji
    ctx.shadowColor   = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur    = 8;
    ctx.shadowOffsetY = 3;

    ctx.font         = `${size}px serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.emoji, 0, 0);
    ctx.restore();
  }

  // ── API pública ───────────────────────────────────────────────────────────
  return { init, addFood, removeFood, clearFoods };

})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => PlateCanvas.init());