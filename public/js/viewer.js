import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parseSwc } from './swcParser.js';

// SWC compartment type codes mapped to the standard NeuroMorpho color
// convention: soma red, axon gray, basal dendrite green, apical dendrite
// magenta, glia blue. Unlisted types fall back to a neutral gray.
const COLOR_BY_TYPE = {
  1: 0xc94b4b,
  2: 0x737373,
  3: 0x3f9142,
  4: 0xb23fa0,
  5: 0x737373,
  6: 0xc97fb0,
  7: 0x3f6fb2,
};
const FALLBACK_COLOR = 0x9a9a9a;
const SOMA_TYPE = 1;

// Renders one neuron morphology from parsed SWC samples as colored line
// segments, with orbit controls for rotate/pan/zoom. One instance per
// on-screen viewport; the detail page uses one, the compare page uses two.
export class NeuronViewer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1_000_000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);
    this.handleResize();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  handleResize() {
    const { clientWidth, clientHeight } = this.container;
    if (clientWidth === 0 || clientHeight === 0) return;
    this.renderer.setSize(clientWidth, clientHeight);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  animate() {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  loadSwc(swcText) {
    if (this.group) this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.somaMesh = null;

    const samples = parseSwc(swcText);
    this.lastSamples = samples;
    this.addBranchLines(samples);
    this.addSoma(samples);
    this.frameCamera(samples);
  }

  addBranchLines(samples) {
    const positionsByColor = new Map();

    for (const sample of samples.values()) {
      const parent = samples.get(sample.parent);
      if (!parent) continue;

      const color = COLOR_BY_TYPE[sample.type] ?? FALLBACK_COLOR;
      if (!positionsByColor.has(color)) positionsByColor.set(color, []);
      positionsByColor.get(color).push(parent.x, parent.y, parent.z, sample.x, sample.y, sample.z);
    }

    for (const [color, positions] of positionsByColor) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      this.group.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color })));
    }
  }

  addSoma(samples) {
    const soma = [...samples.values()].find((sample) => sample.type === SOMA_TYPE);
    if (!soma) return;

    const geometry = new THREE.SphereGeometry(Math.max(soma.radius, 2), 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: COLOR_BY_TYPE[SOMA_TYPE] });
    this.somaMesh = new THREE.Mesh(geometry, material);
    this.somaMesh.position.set(soma.x, soma.y, soma.z);
    this.group.add(this.somaMesh);
  }

  frameCamera(samples) {
    const box = new THREE.Box3();
    for (const sample of samples.values()) {
      box.expandByPoint(new THREE.Vector3(sample.x, sample.y, sample.z));
    }
    const size = box.getSize(new THREE.Vector3()).length() || 200;
    const center = box.getCenter(new THREE.Vector3());

    this.camera.position.set(center.x + size * 0.7, center.y + size * 0.4, center.z + size * 0.7);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
  }

  // Re-frames the camera on the current morphology, undoing any rotate/pan/zoom.
  resetView() {
    if (this.lastSamples) this.frameCamera(this.lastSamples);
  }

  // Wireframe only has a visible effect on the soma mesh — the branches are
  // already rendered as line segments, not solid geometry.
  setWireframe(enabled) {
    if (this.somaMesh) this.somaMesh.material.wireframe = enabled;
  }

  toggleFullscreen() {
    if (document.fullscreenElement === this.container) {
      document.exitFullscreen();
    } else {
      this.container.requestFullscreen();
    }
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
