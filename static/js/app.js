import { api } from "./api.js";
import { MapView } from "./map-view.js";
const $ = (id) => document.getElementById(id);
const warnings = {
  glasses: "Eye protection",
  gloves: "Gloves",
  mask: "Respiratory protection",
  fire: "Heat / fire",
  hand: "Staff supervision",
  bolt: "Electrical safety",
};
const labels = {
  available: "Verified",
  needs_review: "Needs review",
  archived: "Archived",
};
const state = {
  maps: [],
  items: [],
  map: null,
  selected: null,
  staff: false,
  draft: null,
  page: 1,
  total: 0,
  controller: null,
  placing: false,
  preview: null,
  history: [],
};
const view = new MapView(selectItem, placePoint);
function notify(text, error = false) {
  $("notice").textContent = text;
  $("notice").classList.toggle("error", error);
  $("notice").hidden = !text;
}
function imagePath(path) {
  return typeof path === "string" &&
    /^\/static\/(thumbnails|uploads|optimized|img)\//.test(path)
    ? path
    : "/static/img/default.png";
}
function photo(img, path) {
  img.src = imagePath(path);
  img.onerror = () => {
    img.onerror = null;
    img.src = "/static/img/default.png";
  };
}
function bind(id, event, handler) {
  $(id).addEventListener(event, (e) =>
    Promise.resolve(handler(e)).catch((err) => {
      if (err.name !== "AbortError") notify(err.message, true);
    }),
  );
}
function staffUI() {
  $("staff-button").textContent = state.staff ? "Sign out" : "Staff sign in";
  $("add-button").hidden = !state.staff;
  $("export").hidden = !state.staff;
  $("status-filter").querySelector("[value=archived]").hidden = !state.staff;
  for (const id of ["edit-button", "history-button", "archive-button"])
    $(id).hidden = !state.staff;
}
async function loadItems(append = false) {
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  $("item-list").setAttribute("aria-busy", "true");
  const params = new URLSearchParams({
    map_id: state.map.id,
    q: $("search").value,
    status: $("status-filter").value,
    stock: $("stock-filter").value,
    page: append ? state.page + 1 : 1,
  });
  try {
    const data = await api("/api/items?" + params, {
      signal: controller.signal,
    });
    if (controller !== state.controller) return;
    state.items = append ? [...state.items, ...data.items] : data.items;
    state.page = data.page;
    state.total = data.total;
    renderItems();
    view.setItems(state.items);
    if (state.selected) {
      const current = state.items.find((i) => i.id === state.selected.id);
      if (current) selectItem(current);
      else clearSelection();
    }
  } finally {
    if (controller === state.controller)
      $("item-list").setAttribute("aria-busy", "false");
  }
}
function renderItems() {
  $("item-count").textContent =
    state.total + (state.total === 1 ? " item" : " items");
  $("item-list").replaceChildren();
  $("load-more").hidden = state.items.length >= state.total;
  if (!state.items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No items found. Try another search or filter.";
    $("item-list").append(p);
  }
  for (const item of state.items) {
    const card = document.createElement("button");
    card.className = "item-card";
    card.dataset.itemId = item.id;
    card.setAttribute("aria-pressed", String(item.id === state.selected?.id));
    if (item.image_path) {
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      photo(img, item.thumbnail_path || item.image_path);
      card.append(img);
    } else {
      const initial = document.createElement("span");
      initial.className = "tool-initial";
      initial.textContent = item.name.slice(0, 1).toUpperCase();
      initial.setAttribute("aria-hidden", "true");
      card.append(initial);
    }
    const copy = document.createElement("span");
    copy.className = "item-copy";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const meta = document.createElement("small");
    meta.textContent = [
      item.zone ||
        item.tags.split(",").slice(0, 2).join(" · ") ||
        "Lab resource",
      item.quantity + " in inventory",
    ].join(" · ");
    copy.append(name, meta);
    card.append(copy);
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden", "true");
    card.append(arrow);
    card.addEventListener("click", () => selectItem(item));
    $("item-list").append(card);
  }
}
function updateSelectionButtons() {
  for (const card of $("item-list").querySelectorAll(".item-card"))
    card.setAttribute(
      "aria-pressed",
      String(Number(card.dataset.itemId) === state.selected?.id),
    );
}
function clearSelection() {
  state.selected = null;
  $("item-detail").hidden = true;
  view.select(null);
  history.replaceState(null, "", location.pathname);
  updateSelectionButtons();
}
function selectItem(item) {
  state.selected = item;
  view.select(item);
  updateSelectionButtons();
  $("item-detail").hidden = false;
  $("detail-name").textContent = item.name;
  $("detail-status").textContent = labels[item.status];
  $("detail-meta").textContent = [
    item.quantity + " in inventory",
    item.zone,
    item.tags,
  ]
    .filter(Boolean)
    .join(" · ");
  $("detail-description").textContent =
    item.description || "No description yet.";
  $("detail-image").hidden = !item.image_path;
  if (item.image_path)
    photo($("detail-image"), item.thumbnail_path || item.image_path);
  $("detail-warnings").replaceChildren();
  for (const warning of item.warning.split(",").filter(Boolean)) {
    const chip = document.createElement("span");
    chip.className = "warning-chip";
    chip.textContent = warnings[warning] || warning;
    $("detail-warnings").append(chip);
  }
  $("detail-link").hidden = !item.link;
  if (item.link && /^https?:\/\//i.test(item.link))
    $("detail-link").href = item.link;
  else $("detail-link").hidden = true;
  $("archive-button").textContent =
    item.status === "archived" ? "Unarchive" : "Archive";
  staffUI();
  history.replaceState(null, "", "#item=" + item.id);
}
async function chooseMap(id) {
  state.map = state.maps.find((m) => m.id === Number(id)) || state.maps[0];
  $("map-select").value = state.map.id;
  clearSelection();
  view.setItems([]);
  view.setMap(state.map);
  await loadItems();
}
async function revealItem(item) {
  $("search").value = "";
  $("status-filter").value = item.status === "archived" ? "archived" : "active";
  $("stock-filter").value = "";
  if (state.map.id !== item.map_id) await chooseMap(item.map_id);
  else await loadItems();
  selectItem(item);
}
function fillSelect(select) {
  select.replaceChildren();
  for (const map of state.maps) {
    const option = document.createElement("option");
    option.value = map.id;
    option.textContent = map.name;
    select.append(option);
  }
}
const form = $("edit-form");
function locationSummary() {
  const d = state.draft;
  const two = [d.x_coord, d.y_coord].every(Number.isFinite),
    three = [d.x_coord_model, d.y_coord_model, d.z_coord_model].every(
      Number.isFinite,
    );
  $("edit-location-summary").textContent = [
    two ? "Floor-plan location saved" : "No floor-plan location",
    three ? "3D location saved" : "No 3D location",
  ].join(" · ");
  $("place-3d").disabled = !state.maps.find(
    (m) => m.id === Number(form.elements.map_id.value),
  )?.model_path;
}
function editItem(item = null) {
  state.draft = item
    ? structuredClone(item)
    : {
        map_id: state.map.id,
        name: "",
        tags: "",
        zone: "",
        quantity: 1,
        description: "",
        link: "",
        warning: "",
        status: "available",
        x_coord: null,
        y_coord: null,
        x_coord_model: null,
        y_coord_model: null,
        z_coord_model: null,
      };
  form.reset();
  $("edit-error").textContent = "";
  $("edit-title").textContent = item ? "Edit item" : "Add an item";
  for (const name of [
    "name",
    "tags",
    "zone",
    "quantity",
    "description",
    "link",
    "status",
    "map_id",
  ])
    form.elements[name].value = state.draft[name] ?? "";
  for (const input of $("warning-options").querySelectorAll("input"))
    input.checked = state.draft.warning.split(",").includes(input.value);
  $("image-preview").hidden = !item?.image_path;
  if (item?.image_path) photo($("image-preview"), item.image_path);
  $("remove-image").checked = false;
  locationSummary();
  $("edit-dialog").showModal();
}
function readDraft() {
  const data = { ...state.draft };
  for (const key of ["name", "tags", "zone", "description", "link", "status"])
    data[key] = form.elements[key].value;
  data.map_id = Number(form.elements.map_id.value);
  data.quantity = Number(form.elements.quantity.value);
  data.warning = [...$("warning-options").querySelectorAll("input:checked")]
    .map((i) => i.value)
    .join(",");
  return data;
}
async function beginPlacement(mode) {
  state.draft = readDraft();
  if (state.map.id !== state.draft.map_id) await chooseMap(state.draft.map_id);
  await view.setView(mode);
  state.placing = true;
  view.place(true);
  $("edit-dialog").close();
  $("placement-bar").hidden = false;
  $("placement-text").textContent =
    "Choose a location for " + (state.draft.name || "this item") + ".";
  $("map-stage").scrollIntoView({ block: "center", behavior: "instant" });
}
function endPlacement() {
  state.placing = false;
  view.place(false);
  $("placement-bar").hidden = true;
  $("edit-dialog").showModal();
}
function placePoint(point) {
  Object.assign(state.draft, point);
  locationSummary();
  endPlacement();
}
async function saveItem(event) {
  event.preventDefault();
  if ($("save-button").disabled) return;
  const draft = readDraft(),
    keys = [
      "name",
      "tags",
      "zone",
      "quantity",
      "description",
      "link",
      "status",
      "map_id",
      "x_coord",
      "y_coord",
      "x_coord_model",
      "y_coord_model",
      "z_coord_model",
    ];
  const data = Object.fromEntries(keys.map((k) => [k, draft[k] ?? null]));
  if (draft.id) data.revision = draft.revision;
  data.remove_image = $("remove-image").checked;
  const body = new FormData();
  body.append("payload", JSON.stringify(data));
  if ($("edit-image").files[0]) body.append("image", $("edit-image").files[0]);
  $("save-button").disabled = true;
  $("edit-error").textContent = "";
  try {
    const saved = await api("/api/items" + (draft.id ? "/" + draft.id : ""), {
      method: draft.id ? "PATCH" : "POST",
      body,
    });
    $("edit-dialog").close();
    state.draft = null;
    await revealItem(saved);
    notify("Item saved.");
    if (state.preview) {
      URL.revokeObjectURL(state.preview);
      state.preview = null;
    }
  } catch (error) {
    $("edit-error").textContent = error.message;
  } finally {
    $("save-button").disabled = false;
  }
}
async function showHistory() {
  const records = await api("/api/items/" + state.selected.id + "/history");
  $("history-list").replaceChildren();
  for (const record of records) {
    const li = document.createElement("li");
    const title = document.createElement("span");
    title.textContent =
      record.action +
      " · " +
      new Date(record.created_at).toLocaleString() +
      " · " +
      record.snapshot.name;
    li.append(title);
    const button = document.createElement("button");
    button.className = "outline";
    button.textContent = "Restore this snapshot";
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const saved = await api(
          "/api/items/" + state.selected.id + "/restore",
          {
            method: "POST",
            body: { history_id: record.id, revision: state.selected.revision },
          },
        );
        $("history-dialog").close();
        await revealItem(saved);
        notify("Snapshot restored.");
      } catch (error) {
        notify(error.message, true);
      } finally {
        button.disabled = false;
      }
    });
    li.append(button);
    $("history-list").append(li);
  }
  $("history-dialog").showModal();
}
for (const [value, label] of Object.entries(warnings)) {
  const wrapper = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = value;
  wrapper.append(input, document.createTextNode(label));
  $("warning-options").append(wrapper);
}
for (const button of document.querySelectorAll("[data-close]"))
  button.addEventListener("click", () => $(button.dataset.close).close());
bind("map-select", "change", (e) => chooseMap(e.target.value));
let searchTimer;
bind("search", "input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(
    () =>
      loadItems().catch((e) => {
        if (e.name !== "AbortError") notify(e.message, true);
      }),
    220,
  );
});
for (const id of ["status-filter", "stock-filter"])
  bind(id, "change", () => loadItems());
bind("load-more", "click", () => loadItems(true));
bind("view-2d", "click", () => view.setView("2d"));
bind("view-3d", "click", () => view.setView("3d"));
bind("reset-view", "click", () => view.reset());
bind("add-button", "click", () => editItem());
bind("edit-button", "click", () => editItem(state.selected));
bind("edit-form", "submit", saveItem);
bind("place-2d", "click", () => beginPlacement("2d"));
bind("place-3d", "click", () => beginPlacement("3d"));
bind("cancel-placement", "click", endPlacement);
bind("edit-map", "change", () => {
  for (const k of [
    "x_coord",
    "y_coord",
    "x_coord_model",
    "y_coord_model",
    "z_coord_model",
  ])
    state.draft[k] = null;
  locationSummary();
});
bind("clear-location", "click", () => {
  for (const k of [
    "x_coord",
    "y_coord",
    "x_coord_model",
    "y_coord_model",
    "z_coord_model",
  ])
    state.draft[k] = null;
  locationSummary();
});
bind("edit-image", "change", () => {
  if (state.preview) URL.revokeObjectURL(state.preview);
  const file = $("edit-image").files[0];
  if (!file) return;
  state.preview = URL.createObjectURL(file);
  $("image-preview").src = state.preview;
  $("image-preview").hidden = false;
});
bind("staff-button", "click", async () => {
  if (!state.staff) {
    $("login-error").textContent = "";
    $("login-dialog").showModal();
    return;
  }
  await api("/api/logout", { method: "POST" });
  state.staff = false;
  $("status-filter").value = "active";
  staffUI();
  await loadItems();
  notify("Signed out.");
});
bind("login-form", "submit", async (e) => {
  e.preventDefault();
  const button = e.target.querySelector("[type=submit]");
  button.disabled = true;
  try {
    await api("/api/login", {
      method: "POST",
      body: { password: $("password").value },
    });
    state.staff = true;
    $("password").value = "";
    $("login-dialog").close();
    staffUI();
    $("cloud-choice").hidden = !state.ai;
    notify("Staff editing enabled.");
  } catch (error) {
    $("login-error").textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
bind("archive-button", "click", async () => {
  const item = state.selected;
  if (!item) return;
  if (item.status === "archived") {
    await api("/api/items/" + item.id, {
      method: "PATCH",
      body: { revision: item.revision, status: "needs_review" },
    });
    notify("Item restored to the review list.");
  } else {
    $("archive-description").textContent = "Archive " + item.name + "?";
    $("archive-dialog").showModal();
    return;
  }
  clearSelection();
  await loadItems();
});
bind("confirm-archive", "click", async () => {
  const item = state.selected;
  if (!item) return;
  $("confirm-archive").disabled = true;
  try {
    await api("/api/items/" + item.id, {
      method: "DELETE",
      body: { revision: item.revision },
    });
    $("archive-dialog").close();
    notify("Item archived. Its history and photos are preserved.");
    clearSelection();
    await loadItems();
  } finally {
    $("confirm-archive").disabled = false;
  }
});
bind("history-button", "click", showHistory);
bind("copy-link", "click", async () => {
  await navigator.clipboard.writeText(
    location.origin + "/#item=" + state.selected.id,
  );
  notify("Item link copied.");
});
bind("finder-open", "click", () => {
  $("cloud-choice").hidden = !(state.staff && state.ai);
  $("finder-dialog").showModal();
});
bind("finder-form", "submit", async (e) => {
  e.preventDefault();
  $("finder-submit").disabled = true;
  $("finder-result").textContent = "Finding tools…";
  const message = $("finder-input").value;
  try {
    const data = await api("/api/chat", {
      method: "POST",
      body: {
        message,
        map_id: state.map.id,
        cloud: state.staff && state.ai && $("cloud-enabled").checked,
        history: state.history,
      },
    });
    state.history = [
      ...state.history,
      { role: "user", content: message },
      { role: "assistant", content: data.message },
    ].slice(-6);
    $("finder-result").textContent = data.message;
    for (const marker of data.markers) {
      const item = await api("/api/items/" + marker.item_id);
      const button = document.createElement("button");
      button.className = "finder-item";
      button.textContent = "Locate " + item.name + " ↗";
      button.addEventListener("click", async () => {
        $("finder-dialog").close();
        await revealItem(item);
      });
      $("finder-result").append(button);
    }
  } catch (error) {
    $("finder-result").textContent = error.message;
  } finally {
    $("finder-submit").disabled = false;
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) &&
    !document.querySelector("dialog[open]")
  ) {
    e.preventDefault();
    $("search").focus();
  }
});
async function start() {
  const session = await api("/api/session");
  state.staff = session.staff;
  state.ai = session.ai_enabled;
  staffUI();
  state.maps = await api("/api/maps");
  if (!state.maps.length)
    throw new Error(
      "No spaces are configured. Run the database setup command.",
    );
  fillSelect($("map-select"));
  fillSelect($("edit-map"));
  const initial = Number(
    new URLSearchParams(location.hash.slice(1)).get("item"),
  );
  let item = null;
  if (initial) {
    try {
      item = await api("/api/items/" + initial);
    } catch (error) {
      notify(error.message, true);
    }
  }
  await chooseMap(item?.map_id || state.maps[0].id);
  if (item) {
    if (!state.items.some((i) => i.id === item.id)) {
      state.items.push(item);
      view.setItems(state.items);
    }
    selectItem(item);
  }
  if (new URLSearchParams(location.search).get("view") === "3d")
    await view.setView("3d");
}
start().catch((error) => {
  notify(error.message, true);
  $("item-count").textContent = "Unavailable";
  $("item-list").setAttribute("aria-busy", "false");
});
