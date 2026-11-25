import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const stoppedColors = { BLOCKED: 0xff907f, UNKNOWN: 0xf0c175 };
const stateColors = [0xab91f3, 0x7edcdb, 0x96a6ff, 0xf1acd9, 0xc3e0a3, 0xf9d398];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function createScheduleModel(container, onPick) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.replaceChildren(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduced;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 21;
  controls.maxPolarAngle = Math.PI * .72;
  const reset = () => {
    camera.position.set(8.2, 6.8, 10);
    controls.target.set(0, .25, .15);
    controls.update();
  };
  reset();

  const platform = new THREE.GridHelper(12, 18, 0x7c6a9d, 0x423657);
  platform.position.y = -.54;
  scene.add(platform, new THREE.HemisphereLight(0xf9f2ff, 0x634075, 2.5));
  const field = new THREE.Group();
  scene.add(field);
  const points = [];
  const map = new Map();
  const tracer = new THREE.Mesh(new THREE.SphereGeometry(.10, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  tracer.visible = false;
  scene.add(tracer);
  let selected = '';
  let from = -Infinity;
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let press;
  renderer.domElement.addEventListener('pointerdown', event => { press = [event.clientX, event.clientY]; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!press || Math.hypot(event.clientX - press[0], event.clientY - press[1]) > 6) return;
    const { left, top, width, height } = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - left) / width * 2 - 1, -(event.clientY - top) / height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(points)[0];
    if (hit) onPick(hit.object.userData.order);
  });
  new ResizeObserver(() => {
    const { clientWidth, clientHeight } = container;
    if (!clientWidth || !clientHeight) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }).observe(container);
  function draw() {
    requestAnimationFrame(draw);
    if (!container.clientWidth || !container.clientHeight) return;
    controls.update();
    const route = map.get(selected);
    if (route && tracer.visible) {
      const progress = reduced ? 1 : Math.min(1, (performance.now() - from) / (700 * route.steps));
      tracer.position.copy(route.curve.getPointAt(Math.max(0, progress)));
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(draw);
  return {
    setPaths(paths) {
      field.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose(); });
      field.clear();
      points.length = 0;
      map.clear();
      tracer.visible = false;
      for (const [index, path] of paths.entries()) {
        const x = (index - 2.5) * 1.25;
        const color = path.stopped_at ? stoppedColors[path.result] : stateColors[Number(path.result)];
        const controls = [new THREE.Vector3(0, -.1, 2.65),
          ...path.steps.map((_, i) => new THREE.Vector3(x, .10 + i * .42, .9 - 1.32 * i))];
        const curve = new THREE.CatmullRomCurve3(controls, false, 'centripetal');
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55 });
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 44, .035, 8, false), material);
        field.add(tube);
        for (const [i, position] of controls.slice(1).entries()) {
          const terminal = i === controls.length - 2;
          const geometry = terminal && path.stopped_at
            ? new THREE.OctahedronGeometry(.19) : new THREE.BoxGeometry(.28, .13, .28);
          const node = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            color, roughness: .22, metalness: .18, emissive: color, emissiveIntensity: .19,
          }));
          node.position.copy(position);
          node.rotation.y = Math.PI / 4;
          node.userData.order = path.order;
          points.push(node);
          field.add(node);
        }
        map.set(path.order, { curve, material, steps: path.steps.length });
      }
      const origin = new THREE.Mesh(new THREE.IcosahedronGeometry(.20),
        new THREE.MeshStandardMaterial({ color: 0xe8dafb, emissive: 0xc9afea, emissiveIntensity: .25 }));
      origin.position.set(0, -.1, 2.65);
      field.add(origin);
    },
    highlight(order) {
      selected = order;
      for (const [key, route] of map) route.material.opacity = key === order ? 1 : .34;
      for (const node of points) node.material.emissiveIntensity = node.userData.order === order ? .66 : .15;
      tracer.visible = false;
    },
    replay() { from = performance.now(); tracer.visible = map.has(selected); },
    reset,
  };
}
