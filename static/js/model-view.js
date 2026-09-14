import * as THREE from "../vendor/three/three.module.js";
import { OrbitControls } from "../vendor/three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "../vendor/three/addons/loaders/GLTFLoader.js";

export class Lab3D {
  constructor(container, onSelect, onPlace) {
    this.container = container;
    this.onSelect = onSelect;
    this.onPlace = onPlace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#eef2e9");
    this.camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.append(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = false;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 5;
    this.controls.addEventListener("change", () => this.render());
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x536554, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(4, 8, 5);
    this.scene.add(light);
    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);
    this.sphere = new THREE.SphereGeometry(0.038, 12, 8);
    this.cone = new THREE.ConeGeometry(0.075, 0.2, 12);
    this.normalMaterial = new THREE.MeshBasicMaterial({
      color: "#277559",
      depthTest: false,
    });
    this.selectedMaterial = new THREE.MeshBasicMaterial({
      color: "#e4b838",
      depthTest: false,
    });
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector3();
    this.size = 5;
    this.generation = 0;
    new ResizeObserver(() => this.resize()).observe(container);
    let start = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      start = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6)
        return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        this.camera,
      );
      if (this.placing && this.model) {
        const hit = this.raycaster.intersectObject(this.model, true)[0];
        if (hit)
          this.onPlace({
            x_coord_model: hit.point.x,
            y_coord_model: hit.point.y,
            z_coord_model: hit.point.z,
          });
      } else {
        const hit = this.raycaster.intersectObjects(
          this.markerGroup.children,
          true,
        )[0];
        if (hit?.object.userData.item) this.onSelect(hit.object.userData.item);
      }
    });
  }
  async load(path) {
    if (this.path === path && this.model) return;
    if (this.loadingPath === path && this.loading) return this.loading;
    const version = ++this.generation;
    this.loadingPath = path;
    this.loading = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        path,
        (gltf) => {
          if (version !== this.generation) {
            this.disposeModel(gltf.scene);
            resolve();
            return;
          }
          if (this.model) {
            this.scene.remove(this.model);
            this.disposeModel(this.model);
          }
          this.model = gltf.scene;
          // Preserve the exact 2024 world transform used by recovered 3D coordinates.
          this.model.scale.setScalar(0.015);
          this.model.rotation.y = THREE.MathUtils.degToRad(50);
          this.model.position.y = -0.5;
          this.model.updateMatrixWorld(true);
          this.scene.add(this.model);
          this.path = path;
          const bounds = new THREE.Box3().setFromObject(this.model);
          bounds.getCenter(this.center);
          const extent = bounds.getSize(new THREE.Vector3());
          this.size = Math.max(extent.x, extent.y, extent.z) * 1.15;
          this.reset();
          resolve();
        },
        undefined,
        reject,
      );
    });
    try {
      await this.loading;
    } finally {
      if (version === this.generation) {
        this.loading = null;
        this.loadingPath = null;
      }
    }
  }
  disposeModel(model) {
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      for (const material of [node.material].flat()) {
        for (const value of Object.values(material))
          if (value?.isTexture) value.dispose();
        material.dispose();
      }
    });
  }
  setItems(items, selected) {
    this.markerGroup.clear();
    for (const item of items) {
      if (
        !["x_coord_model", "y_coord_model", "z_coord_model"].every((k) =>
          Number.isFinite(item[k]),
        )
      )
        continue;
      const active = selected === item.id;
      const marker = new THREE.Mesh(
        active ? this.cone : this.sphere,
        active ? this.selectedMaterial : this.normalMaterial,
      );
      marker.position.set(
        item.x_coord_model,
        item.y_coord_model + (active ? 0.19 : 0),
        item.z_coord_model,
      );
      if (active) marker.rotation.z = Math.PI;
      marker.userData.item = item;
      marker.renderOrder = 10;
      this.markerGroup.add(marker);
    }
    this.render();
  }
  reset() {
    this.camera.zoom = 1;
    this.camera.position
      .copy(this.center)
      .add(
        new THREE.Vector3(-4, 6, 5).normalize().multiplyScalar(this.size * 2),
      );
    this.controls.target.copy(this.center);
    this.controls.update();
    this.resize();
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h,
      half = this.size * 0.48;
    this.camera.left = -half * aspect;
    this.camera.right = half * aspect;
    this.camera.top = half;
    this.camera.bottom = -half;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.render();
  }
  render() {
    if (!this.container.hidden) this.renderer.render(this.scene, this.camera);
  }
}
