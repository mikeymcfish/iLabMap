const el = (id) => document.getElementById(id);
const hasPoint = (item) =>
  item && [item.x_coord, item.y_coord].every(Number.isFinite);
export class MapView {
  constructor(onSelect, onPlace) {
    this.onSelect = onSelect;
    this.onPlace = onPlace;
    this.items = [];
    this.selected = null;
    this.view = "2d";
    this.map = null;
    this.viewer = null;
    this.placing = false;
    this.image = el("floor-image");
    this.surface = el("floor-surface");
    this.markers = el("floor-markers");
    this.image.addEventListener("load", () => {
      this.error("");
      this.layout();
    });
    this.image.addEventListener("error", () =>
      this.error(
        "This floor plan could not load. Inventory is still available.",
      ),
    );
    new ResizeObserver(() => this.layout()).observe(this.surface);
    this.surface.addEventListener("click", (event) => {
      if (!this.placing || this.view !== "2d" || !this.map) return;
      const r = this.markers.getBoundingClientRect();
      const x = ((event.clientX - r.left) / r.width) * this.map.width;
      const y = ((event.clientY - r.top) / r.height) * this.map.height;
      if (x >= 0 && x <= this.map.width && y >= 0 && y <= this.map.height)
        this.onPlace({ x_coord: x, y_coord: y });
    });
  }
  error(message) {
    el("map-error").textContent = message;
    el("map-error").hidden = !message;
  }
  setMap(map) {
    this.map = map;
    this.selected = null;
    this.image.src = map.svg_path;
    this.image.alt = map.name + " floor plan";
    this.error("");
    el("view-3d").disabled = !map.model_path;
    this.layout();
    if (this.view === "3d") {
      if (map.model_path) this.load3d();
      else this.setView("2d");
    }
  }
  setItems(items) {
    this.items = items;
    this.layout();
    this.viewer?.setItems(items, this.selected);
  }
  select(item) {
    // A direct link or finder result can be beyond the current inventory page.
    if (item && !this.items.some((entry) => entry.id === item.id))
      this.items = [...this.items, item];
    this.selected = item?.id ?? null;
    this.layout();
    this.viewer?.setItems(this.items, this.selected);
    const located =
      this.view === "2d"
        ? hasPoint(item)
        : item &&
          ["x_coord_model", "y_coord_model", "z_coord_model"].every((k) =>
            Number.isFinite(item[k]),
          );
    el("map-hint").textContent = item
      ? located
        ? item.name + " · " + (item.zone || "Location highlighted")
        : item.name + " · No location saved in this view"
      : "Select a tool to find it on the map.";
  }
  layout() {
    if (!this.map || !this.surface.clientWidth) return;
    const scale = Math.min(
      this.surface.clientWidth / this.map.width,
      this.surface.clientHeight / this.map.height,
    );
    const w = scale * this.map.width,
      h = scale * this.map.height;
    Object.assign(this.markers.style, {
      left: (this.surface.clientWidth - w) / 2 + "px",
      top: (this.surface.clientHeight - h) / 2 + "px",
      width: w + "px",
      height: h + "px",
    });
    this.markers.replaceChildren();
    for (const item of this.items) {
      if (!hasPoint(item)) continue;
      const marker = document.createElement("button");
      marker.className =
        "map-marker" + (item.id === this.selected ? " selected" : "");
      marker.dataset.itemId = item.id;
      marker.dataset.label = item.name;
      marker.setAttribute("aria-label", "Locate " + item.name);
      marker.style.left = (item.x_coord / this.map.width) * 100 + "%";
      marker.style.top = (item.y_coord / this.map.height) * 100 + "%";
      marker.addEventListener("click", (event) => {
        if (!this.placing) {
          event.stopPropagation();
          this.onSelect(item);
        }
      });
      this.markers.append(marker);
    }
  }
  async setView(view) {
    if (view === "3d" && !this.map?.model_path) return;
    this.view = view;
    this.error("");
    el("floor-plan").hidden = view !== "2d";
    el("model-view").hidden = view !== "3d";
    el("view-2d").setAttribute("aria-pressed", String(view === "2d"));
    el("view-3d").setAttribute("aria-pressed", String(view === "3d"));
    if (view === "3d") await this.load3d();
    else this.layout();
    this.select(this.items.find((i) => i.id === this.selected));
  }
  async load3d() {
    const map = this.map;
    if (!map?.model_path) return;
    this.error("Loading the 3D lab…");
    try {
      if (!this.viewer) {
        const { Lab3D } = await import("./model-view.js");
        this.viewer = new Lab3D(
          el("model-view"),
          (item) => this.onSelect(item),
          (point) => {
            if (this.placing) this.onPlace(point);
          },
        );
      }
      await this.viewer.load(map.model_path);
      if (map !== this.map || this.view !== "3d") return;
      this.viewer.setItems(this.items, this.selected);
      this.viewer.placing = this.placing;
      this.viewer.resize();
      this.error("");
    } catch (error) {
      if (this.view === "3d")
        this.error(
          "3D view is unavailable. Use the floor plan to locate tools.",
        );
      console.warn("3D viewer:", error.message);
    }
  }
  place(enabled) {
    this.placing = enabled;
    this.surface.classList.toggle("placing", enabled);
    if (this.viewer) this.viewer.placing = enabled;
  }
  reset() {
    this.viewer?.reset();
  }
}
