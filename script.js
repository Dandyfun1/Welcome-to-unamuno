// UNAMUNO polished final - clear green theme with infinite calendar
// IMPORTANT: Replace SUPABASE_URL and SUPABASE_ANON_KEY with your Supabase project values
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; // <-- REPLACE
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ";               // <-- REPLACE
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date(); // month view cursor

document.addEventListener("DOMContentLoaded", () => {
  // Element refs
  const adminPanel = $("#admin-panel");
  const calendarPanel = $("#calendar-panel");
  const publicPostBtn = $("#public-post-btn");
  const adminToggle = $("#admin-toggle");
  const calendarToggle = $("#calendar-toggle");
  const searchBtn = $("#search-btn");
  const searchInput = $("#search-input");
  const itemsGrid = $("#items-grid");
  const pinnedArea = $("#pinned-area");
  const notifications = $("#notifications");

  // Calendar refs
  const calPrev = $("#cal-prev");
  const calNext = $("#cal-next");
  const calTitle = $("#cal-title");
  const calGrid = $("#calendar-grid");
  const eventPopup = $("#event-popup");
  const eventDateTitle = $("#event-date-title");
  const eventDetails = $("#event-details");
  const eventAdminControls = $("#event-admin-controls");

  // Draggable panels
  enableDrag("#admin-panel", "#admin-drag");
  enableDrag("#calendar-panel", "#calendar-drag");

  // Init session & data
  init();

  // UI bindings
  adminToggle.addEventListener("click", async () => {
    showPanel("#admin-panel");
    await populateAdmin();
  });
  $("#admin-close")?.addEventListener("click", () => hidePanel("#admin-panel"));
  calendarToggle.addEventListener("click", async () => {
    showPanel("#calendar-panel");
    await loadEvents();
    renderCalendar(calendarCursor);
  });
  $("#calendar-close")?.addEventListener("click", () =>
    hidePanel("#calendar-panel")
  );
  $("#cal-prev")?.addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar(calendarCursor);
  });
  $("#cal-next")?.addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar(calendarCursor);
  });

  $("#login-btn")?.addEventListener("click", async () => {
    const email = ($("#pw-input")?.value || "").trim();
    if (!email) return alert("Introduce el email del admin.");
    const password = prompt("Introduce la contraseña:");
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return alert("Error al iniciar sesión: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    await loadAll();
    toast("Sesión iniciada");
  });

  $("#logout-btn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    hidePanel("#admin-panel");
    toast("Sesión cerrada");
  });

  $("#save-changes")?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");
    const title = $("#edit-title").value || "UNAMUNO";
    const sub = $("#edit-sub").value || "";
    const accent = $("#edit-accent").value || "#16a34a";
    const logo = $("#edit-logo").value || null;
    const hero = $("#edit-hero").value || null;
    const { error } = await supabaseClient.from("site_settings").upsert([
      {
        id: "00000000-0000-0000-0000-000000000001",
        title,
        description: sub,
        accent,
        logo_url: logo,
        hero_url: hero,
      },
    ]);
    if (error) return alert("Save failed: " + error.message);
    document.documentElement.style.setProperty("--accent", accent);
    await loadSiteSettings();
    toast("Configuración guardada");
  });

  $("#export-btn")?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");
    const { data: items } = await supabaseClient.from("items").select("*");
    const { data: events } = await supabaseClient
      .from("calendar_events")
      .select("*");
    const payload = {
      exported_at: new Date().toISOString(),
      items,
      events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      "unamuno_export_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#new-item-btn")?.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");
    const title = prompt("Título del post:");
    if (!title) return;
    const username = prompt("Nombre visible (ej: Admin):") || "Admin";
    const category = prompt("Categoría (opcional):") || null;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([
      {
        title,
        description,
        username,
        category,
      },
    ]);
    if (error) return alert("Create failed: " + error.message);
    await loadItems();
  });

  publicPostBtn?.addEventListener("click", async () => {
    const username = prompt("Nombre visible (ej: María):") || "Anon";
    const title = prompt("Título de la publicación:");
    if (!title) return;
    const category = prompt("Categoría (opcional):") || null;
    const description = prompt("Descripción (opcional):") || null;
    const { error } = await supabaseClient.from("items").insert([
      {
        title,
        description,
        username,
        category,
      },
    ]);
    if (error) {
      return alert("Create failed: " + error.message);
    }
    toast("Publicación creada");
    await loadItems();
  });

  searchBtn?.addEventListener("click", async () => {
    const q = (searchInput.value || "").trim();
    if (!q) return loadItems();
    const { data, error } = await supabaseClient
      .from("items")
      .select("*")
      .or(
        `title.ilike.%${q}%,description.ilike.%${q}%,username.ilike.%${q}%,category.ilike.%${q}%`
      )
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return alert("Search error: " + error.message);
    renderItems(data || []);
  });

  // init
  async function init() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      loggedIn = !!data?.session;
      updateAuthUI();
      await loadAll();
    } catch (e) {
      console.warn("init", e);
    }
    try {
      supabaseClient
        .channel("unamuno_ch")
        .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () =>
          loadItems()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_events" },
          () => {
            loadEvents();
            toast("Calendario actualizado");
          }
        )
        .subscribe();
    } catch (e) {
      console.warn("realtime", e);
    }
  }

  function updateAuthUI() {
    document.getElementById("controls-area")?.classList.toggle("hidden", !loggedIn);
    const status = document.getElementById("status-pill");
    if (status) status.textContent = loggedIn ? "Admin" : "Público";
    document.getElementById("login-area") &&
      (document.getElementById("login-area").style.display = loggedIn
        ? "none"
        : "block");
  }

  async function loadAll() {
    await Promise.all([loadSiteSettings(), loadItems(), loadEvents()]);
  }

  async function loadSiteSettings() {
    const { data, error } = await supabaseClient
      .from("site_settings")
      .select("*")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .maybeSingle();
    if (error) return console.error(error);
    if (data) {
      $("#site-title").textContent = data.title || "UNAMUNO";
      $("#site-sub").textContent = data.description || "";
      $("#edit-title") && ($("#edit-title").value = data.title || "");
      $("#edit-sub") && ($("#edit-sub").value = data.description || "");
      $("#edit-accent") && ($("#edit-accent").value = data.accent || "#16a34a");
      if (data.logo_url) $("#site-logo").src = data.logo_url;
      if (data.hero_url)
        document.querySelector(".hero").style.backgroundImage = `url(${data.hero_url})`;
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  async function loadItems() {
    const { data, error } = await supabaseClient
      .from("items")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadItems", error);
      return alert("Error cargando publicaciones: " + error.message);
    }
    const pinned = (data || []).filter((i) => i.pinned);
    const normal = (data || []).filter((i) => !i.pinned);
    renderPinned(pinned);
    renderItems(normal);
  }

  function renderPinned(items = []) {
    pinnedArea.innerHTML = "";
    if (!items.length) return;
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `<h3>📌 ${escapeHtml(item.title)}</h3><p>${escapeHtml(
        item.description || ""
      )}</p><div class="meta">${escapeHtml(item.username || "Anon")} • ${new Date(
        item.created_at
      ).toLocaleString()}</div>`;
      if (loggedIn) {
        const row = document.createElement("div");
        row.style.marginTop = "8px";
        const unpin = document.createElement("button");
        unpin.className = "ghost small";
        unpin.textContent = "Despinear";
        unpin.onclick = async () => {
          await supabaseClient.from("items").update({ pinned: false }).eq("id", item.id);
          await loadItems();
        };
        const del = document.createElement("button");
        del.className = "danger";
        del.textContent = "Eliminar";
        del.onclick = async () => {
          if (!confirm("Eliminar?")) return;
          await supabaseClient.from("items").delete().eq("id", item.id);
          await loadItems();
        };
        row.appendChild(unpin);
        row.appendChild(del);
        el.appendChild(row);
      }
      pinnedArea.appendChild(el);
    });
  }

  function renderItems(items = []) {
    itemsGrid.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(
        item.description || ""
      )}</p><div class="meta">${escapeHtml(item.username || "Anon")} • ${new Date(
        item.created_at
      ).toLocaleString()} ${
        item.category ? " • " + escapeHtml(item.category) : ""
      }</div>`;
      if (loggedIn) {
        const controls = document.createElement("div");
        controls.style.marginTop = "8px";
        const pinBtn = document.createElement("button");
        pinBtn.className = "pin";
        pinBtn.textContent = item.pinned ? "Despinear" : "Pin";
        pinBtn.onclick = async () => {
          await supabaseClient
            .from("items")
            .update({ pinned: !item.pinned })
            .eq("id", item.id);
          await loadItems();
        };
        const del = document.createElement("button");
        del.className = "danger";
        del.textContent = "Eliminar";
        del.style.marginLeft = "8px";
        del.onclick = async () => {
          if (!confirm("Eliminar?")) return;
          const { error } = await supabaseClient.from("items").delete().eq("id", item.id);
          if (error) return alert("Delete failed: " + error.message);
          await loadItems();
        };
        controls.appendChild(pinBtn);
        controls.appendChild(del);
        card.appendChild(controls);
      }
      itemsGrid.appendChild(card);
    });
  }

  async function loadEvents() {
    const { data, error } = await supabaseClient.from("calendar_events").select("*");
    if (error) return console.error("loadEvents", error);
    eventsCache = data || [];
    if (!$("#calendar-panel").classList.contains("hidden"))
      renderCalendar(calendarCursor);
  }

  function renderCalendar(baseDate) {
    calGrid.innerHTML = "";
    $("#cal-title") &&
      ($("#cal-title").textContent = `${baseDate.toLocaleString("es-ES", {
        month: "long",
        year: "numeric",
      })}`);
    ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].forEach((w) => {
      const el = document.createElement("div");
      el.textContent = w;
      el.style.fontWeight = "700";
      el.style.textAlign = "center";
      calGrid.appendChild(el);
    });
    const year = baseDate.getFullYear(),
      month = baseDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) calGrid.appendChild(document.createElement("div"));
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
      const ev = eventsCache.find((e) => e.event_date === dateStr);
      const dayEl = document.createElement("div");
      dayEl.className = "day";
      const today = new Date();
      const dayDate = new Date(year, month, d);
      if (dayDate.toDateString() === today.toDateString()) dayEl.classList.add("today");
      else if (dayDate < today) dayEl.classList.add("past");
      else dayEl.classList.add("future");
      if (ev) dayEl.classList.add("has-event");
      dayEl.textContent = d;
      dayEl.onclick = () => openEventPopup(dateStr, ev);
      calGrid.appendChild(dayEl);
    }
  }

  function openEventPopup(dateStr, ev) {
    eventPopup.classList.remove("hidden");
    eventDateTitle.textContent = new Date(dateStr).toLocaleDateString("es-ES");
    eventDetails.innerHTML = ev
      ? `<strong>${escapeHtml(ev.title || "")}</strong><p>${escapeHtml(ev.note || "")}</p>`
      : "<em>No hay evento</em>";
    if (loggedIn) {
      eventAdminControls.classList.remove("hidden");
      $("#edit-event-btn").onclick = async () => {
        const title = prompt("Título del evento:", ev ? ev.title : "") || "";
        const note = prompt("Detalles del evento:", ev ? ev.note : "") || "";
        if (!title && !note) {
          if (ev) {
            await supabaseClient.from("calendar_events").delete().eq("event_date", dateStr);
            await loadEvents();
            eventPopup.classList.add("hidden");
            return;
          }
          return;
        }
        const { error } = await supabaseClient
          .from("calendar_events")
          .upsert([{ event_date: dateStr, title, note }], { onConflict: "event_date" });
        if (error) return alert("Save failed: " + error.message);
        await loadEvents();
        eventPopup.classList.add("hidden");
      };
      $("#delete-event-btn").onclick = async () => {
        if (!confirm("Eliminar evento?")) return;
        const { error } = await supabaseClient
          .from("calendar_events")
          .delete()
          .eq("event_date", dateStr);
        if (error) return alert("Delete failed: " + error.message);
        await loadEvents();
        eventPopup.classList.add("hidden");
      };
    } else {
      eventAdminControls.classList.add("hidden");
    }
  }

  // ========================
  // UTILS
  // ========================
  function enableDrag(panelSel, handleSel) {
    const panel = document.querySelector(panelSel);
    const handle = document.querySelector(handleSel);
    if (!panel || !handle) return;
    let dragging = false,
      offsetX = 0,
      offsetY = 0;
    handle.style.cursor = "grab";
    handle.addEventListener("mousedown", (e) => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      document.body.style.userSelect = "none";
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      let left = e.clientX - offsetX;
      let top = e.clientY - offsetY;
      left = Math.max(6, Math.min(left, window.innerWidth - panel.offsetWidth - 6));
      top = Math.max(6, Math.min(top, window.innerHeight - panel.offsetHeight - 6));
      panel.style.left = left + "px";
      panel.style.top = top + "px";
      panel.style.right = "auto";
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
      document.body.style.userSelect = "";
    });
  }
  function showPanel(sel) {
    const el = $(sel);
    if (!el) return;
    el.classList.remove("hidden");
    el.style.display = "block";
  }
  function hidePanel(sel) {
    const el = $(sel);
    if (!el) return;
    el.classList.add("hidden");
    el.style.display = "none";
  }
  function toast(msg, t = 3000) {
    const c = $("#notifications");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), t);
  }
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>\"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );
  }
  async function populateAdmin() {
    await loadSiteSettings();
    await loadItems();
    await loadEvents();
  }
});
