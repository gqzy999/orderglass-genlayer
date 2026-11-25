// Project the schedule geometry in software when the browser cannot start WebGL.
const stopped = { BLOCKED: '#ff907f', UNKNOWN: '#f0c175' };
const endings = ['#ab91f3', '#7edcdb', '#96a6ff', '#f1acd9', '#c3e0a3', '#f9d398'];

export function createScheduleProjection(container, onPick) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d');
  if (!context) throw Error('Canvas unavailable');
  container.replaceChildren(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, yaw = -.36, pitch = .63, zoom = 1;
  let paths = [], selected = '', replayAt = null, press, hitAreas = [];
  let frame = 0;
  const drawSoon = () => { if (!frame) frame = requestAnimationFrame(draw); };
  new ResizeObserver(() => {
    width = container.clientWidth;
    height = container.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(devicePixelRatio, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawSoon();
  }).observe(container);

  function project([x, y, z]) {
    const orbitX = Math.cos(yaw) * x - Math.sin(yaw) * z;
    const orbitZ = Math.sin(yaw) * x + Math.cos(yaw) * z;
    const lift = Math.cos(pitch) * y - Math.sin(pitch) * orbitZ;
    const depth = Math.sin(pitch) * y + Math.cos(pitch) * orbitZ;
    const scale = Math.min(width / 9.8, height / 6.3) * zoom / (1 + depth / 17);
    return [width / 2 + orbitX * scale, height * .55 - lift * scale];
  }
  function stroke(coords, color, weight) {
    context.beginPath();
    coords.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y));
    context.strokeStyle = color;
    context.lineWidth = weight;
    context.stroke();
  }
  function draw(now) {
    frame = 0;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    for (let i = -5; i <= 5; i++) {
      stroke([project([i, -.58, -4]), project([i, -.58, 4])], '#49395f', 1);
      stroke([project([-5, -.58, i * .8]), project([5, -.58, i * .8])], '#49395f', 1);
    }
    hitAreas = [];
    const ranked = paths.map((path, index) => ({ path, index }))
      .sort((a, b) => Number(a.path.order === selected) - Number(b.path.order === selected));
    for (const { path, index } of ranked) {
      const route = [[0, -.08, 2.7], ...path.steps.map((_, step) =>
        [(index - 2.5) * 1.28, .08 + step * .53, .85 - 1.42 * step])];
      const dots = route.map(project);
      const active = path.order === selected;
      const color = path.stopped_at ? stopped[path.result] : endings[Number(path.result)];
      context.globalAlpha = active ? 1 : .57;
      stroke(dots, color, active ? 3 : 1.8);
      for (const [step, [x, y]] of dots.slice(1).entries()) {
        const radius = active ? 6 : 4.5;
        context.beginPath();
        context.moveTo(x, y - radius);
        context.lineTo(x + radius * 1.25, y);
        context.lineTo(x, y + radius);
        context.lineTo(x - radius * 1.25, y);
        context.closePath();
        context.fillStyle = color;
        context.fill();
        hitAreas.push({ x, y, order: path.order });
        if (step === path.steps.length - 1) {
          context.font = '11px monospace';
          context.fillText(path.order, x + 10, y - 7);
        }
      }
      if (active && replayAt !== null) {
        const progress = reduced ? 1 : Math.min(1, (now - replayAt) / (650 * path.steps.length));
        const distance = Math.max(0, progress) * (dots.length - 1);
        const segment = Math.min(dots.length - 2, Math.floor(distance));
        const fraction = distance - segment;
        const [x, y] = dots[segment].map((value, axis) => value + (dots[segment + 1][axis] - value) * fraction);
        context.beginPath();
        context.arc(x, y, 5, 0, 2 * Math.PI);
        context.fillStyle = '#fff';
        context.fill();
        if (progress < 1) drawSoon();
      }
    }
    context.globalAlpha = 1;
  }
  canvas.addEventListener('pointerdown', event => {
    press = { x: event.clientX, y: event.clientY, yaw, pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!press) return;
    yaw = press.yaw + (event.clientX - press.x) * .009;
    pitch = Math.max(.16, Math.min(1.26, press.pitch + (event.clientY - press.y) * .007));
    drawSoon();
  });
  canvas.addEventListener('pointercancel', () => { press = null; });
  canvas.addEventListener('pointerup', event => {
    if (!press) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < 6) {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left, y = event.clientY - rect.top;
      const point = hitAreas.toReversed().find(item => Math.hypot(item.x - x, item.y - y) < 12);
      if (point) onPick(point.order);
    }
    press = null;
  });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = Math.min(1.5, Math.max(.66, zoom * Math.exp(-event.deltaY * .001)));
    drawSoon();
  }, { passive: false });

  return {
    setPaths(next) { paths = next; replayAt = null; drawSoon(); },
    highlight(order) { selected = order; replayAt = null; drawSoon(); },
    replay() { replayAt = performance.now(); drawSoon(); },
    reset() { yaw = -.36; pitch = .63; zoom = 1; drawSoon(); },
  };
}
