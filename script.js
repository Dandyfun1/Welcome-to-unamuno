// UNAMUNO polished final - Reset DB with double confirm, shake, tooltip, hint
const SUPABASE_URL = "https://ddpqzpexcktjtzaqradg.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkcHF6cGV4Y2t0anR6YXFyYWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjczOTcsImV4cCI6MjA3NDgwMzM5N30.yIEsfMgq1SN_M0Un5w1tHj76agBL8Fr9L3dSUtk4hVQ"; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let loggedIn = false;
let eventsCache = [];
let calendarCursor = new Date();

document.addEventListener("DOMContentLoaded", () => {
  const resetBtn = $("#reset-db");

  // Init
  init();

  // Reset DB button
  resetBtn.addEventListener("click", async () => {
    if (!loggedIn) return alert("Solo admin.");

    // Shake
    resetBtn.classList.add("shake");
    setTimeout(() => resetBtn.classList.remove("shake"), 400);

    // First confirm
    const firstConfirm = confirm(
      "⚠️ Atención: Esto borrará y recreará TODA la base de datos con datos de ejemplo.\n\n¿Estás seguro de continuar?"
    );
    if (!firstConfirm) {
      alert("Cancelado.");
      return;
    }

    // Require typing RESET
    const confirmation = prompt("Para confirmar el reseteo escribe RESET en mayúsculas:");
    if (confirmation !== "RESET") {
      alert("Cancelado: No escribiste RESET.");
      return;
    }

    const resetSQL = `
      -- Drop and recreate tables
      drop table if exists site_settings cascade;
      drop table if exists items cascade;
      drop table if exists calendar_events cascade;

      create table site_settings (
        id uuid primary key,
        title text,
        description text,
        accent text,
        logo_url text,
        hero_url text
      );

      create table items (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        description text,
        username text,
        category text,
        pinned boolean default false,
        created_at timestamp with time zone default now()
      );

      create table calendar_events (
        event_date date primary key,
        title text,
        note text
      );

      insert into site_settings (id, title, description, accent)
      values ('00000000-0000-0000-0000-000000000001', 'UNAMUNO', 'Sitio inicial', '#16a34a')
      on conflict (id) do nothing;

      insert into items (title, description, username, category, pinned)
      values ('Bienvenido', 'Primer post de ejemplo', 'Admin', 'general', true);

      insert into calendar_events (event_date, title, note)
      values (current_date, 'Evento inicial', 'Este es un evento de ejemplo')
      on conflict (event_date) do nothing;

      alter table site_settings enable row level security;
      alter table items enable row level security;
      alter table calendar_events enable row level security;

      create policy "Public read site_settings" on site_settings for select using (true);
      create policy "Public read items" on items for select using (true);
      create policy "Public read events" on calendar_events for select using (true);

      create policy "Admin full access site_settings" on site_settings
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
      create policy "Admin full access items" on items
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
      create policy "Admin full access events" on calendar_events
        for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
    `;

    const { error } = await supabaseClient.rpc("exec_sql", { sql: resetSQL });
    if (error) {
      alert("❌ Reset failed: " + error.message);
    } else {
      alert("✅ Base de datos reseteada con datos de ejemplo");
      location.reload();
    }
  });

  // Example: login
  $("#login-btn")?.addEventListener("click", async () => {
    const email = ($("#pw-input")?.value || "").trim();
    if (!email) return alert("Introduce el email del admin.");
    const password = prompt("Introduce la contraseña:");
    if (!password) return;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return alert("Error al iniciar sesión: " + error.message);
    loggedIn = !!data.session;
    updateAuthUI();
    await loadAll();
    toast("Sesión iniciada");
    if (resetBtn) resetBtn.style.display = "inline-block";
  });

  $("#logout-btn")?.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    loggedIn = false;
    updateAuthUI();
    if (resetBtn) resetBtn.style.display = "none";
    toast("Sesión cerrada");
  });

  async function init() {
    try {
      const { data } = await supabaseClient.auth.getSession();
      loggedIn = !!data?.session;
      updateAuthUI();
      await loadAll();
      if (loggedIn && resetBtn) resetBtn.style.display = "inline-block";
    } catch (e) {
      console.warn("init", e);
    }
  }

  function updateAuthUI() {
    document.getElementById("controls-area")?.classList.toggle("hidden", !loggedIn);
    if (document.getElementById("login-area")) {
      document.getElementById("login-area").style.display = loggedIn ? "none" : "block";
    }
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
      document.documentElement.style.setProperty("--accent", data.accent || "#16a34a");
    }
  }

  async function loadItems() {
    const { data, error } = await supabaseClient.from("items").select("*").order("created_at", { ascending: false });
    if (error) return console.error("loadItems", error);
    // render logic…
  }

  async function loadEvents() {
    const { data, error } = await supabaseClient.from("calendar_events").select("*");
    if (error) return console.error("loadEvents", error);
    eventsCache = data || [];
    // render logic…
  }

  function toast(msg, t = 3000) {
    const c = $("#notifications");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), t);
  }
});

