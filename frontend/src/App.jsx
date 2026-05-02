import React, { useState, useEffect, createContext, useContext } from "react";

// ─── API LAYER ────────────────────────────────────────────────────────────────
const BASE = "http://localhost:8000/api";
const getToken = () => localStorage.getItem("token");

async function req(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : null,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

const api = {
  signup: (d) => req("POST", "/auth/signup", d),
  login: (d) => req("POST", "/auth/login", d),
  me: () => req("GET", "/auth/me"),
  getUsers: () => req("GET", "/users"),
  createProject: (d) => req("POST", "/projects", d),
  getProjects: () => req("GET", "/projects"),
  addMembers: (pid, ids) => req("POST", `/projects/${pid}/members`, { user_ids: ids }),
  getMembers: (pid) => req("GET", `/projects/${pid}/members`),
  removeMember: (pid, uid) => req("DELETE", `/projects/${pid}/members/${uid}`),
  createTask: (d) => req("POST", "/tasks", d),
  getTasks: (pid) => req("GET", `/tasks${pid ? `?project_id=${pid}` : ""}`),
  updateTask: (id, status) => req("PUT", `/tasks/${id}`, { status }),
  deleteTask: (id) => req("DELETE", `/tasks/${id}`),
  getReports: () => req("GET", "/reports"),
};

// ─── AUTH CONTEXT ─────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = getToken();
    if (t) api.me().then(setUser).catch(() => localStorage.removeItem("token")).finally(() => setLoading(false));
    else setLoading(false);
  }, []);
  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem("token", res.access_token);
    setUser(res.user);
    return res.user;
  };
  const logout = () => { localStorage.removeItem("token"); setUser(null); };
  return <AuthCtx.Provider value={{ user, login, logout, loading }}>{children}</AuthCtx.Provider>;
}
const useAuth = () => useContext(AuthCtx);

// ─── ICONS (SVG inline) ───────────────────────────────────────────────────────
const Icon = {
  Dashboard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  Project: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7l10-5 10 5-10 5-10-5z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/></svg>,
  Task: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Team: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Report: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Logout: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Warning: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><triangle points="10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: { display: "flex", height: "100vh", fontFamily: "'DM Sans', sans-serif", background: "#0f1117", color: "#e8eaed" },
  sidebar: { width: 220, background: "#161b22", borderRight: "1px solid #21262d", display: "flex", flexDirection: "column", padding: "24px 0" },
  logo: { padding: "0 20px 28px", fontSize: 20, fontWeight: 700, color: "#58a6ff", letterSpacing: "-0.5px" },
  logoSpan: { color: "#7c3aed" },
  navItem: (active) => ({
    display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", cursor: "pointer",
    color: active ? "#58a6ff" : "#8b949e", background: active ? "rgba(88,166,255,0.1)" : "transparent",
    borderLeft: active ? "2px solid #58a6ff" : "2px solid transparent",
    fontSize: 14, fontWeight: active ? 600 : 400, transition: "all 0.15s",
    userSelect: "none",
  }),
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { padding: "16px 28px", borderBottom: "1px solid #21262d", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#161b22" },
  pageTitle: { fontSize: 18, fontWeight: 700, color: "#e8eaed" },
  userBadge: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#8b949e" },
  rolePill: (role) => ({
    background: role === "admin" ? "rgba(124,58,237,0.2)" : "rgba(34,197,94,0.15)",
    color: role === "admin" ? "#a78bfa" : "#4ade80",
    borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600, textTransform: "uppercase"
  }),
  content: { flex: 1, overflow: "auto", padding: 28 },
  card: { background: "#161b22", border: "1px solid #21262d", borderRadius: 12, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, marginBottom: 14, color: "#e8eaed" },
  grid: (cols = 3) => ({ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, marginBottom: 20 }),
  statCard: { background: "#161b22", border: "1px solid #21262d", borderRadius: 12, padding: "20px 24px" },
  statNum: { fontSize: 32, fontWeight: 700, color: "#58a6ff", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#8b949e", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.5px" },
  btn: (variant = "primary") => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
    borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
    background: variant === "primary" ? "#7c3aed" : variant === "danger" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)",
    color: variant === "primary" ? "#fff" : variant === "danger" ? "#f87171" : "#e8eaed",
    transition: "all 0.15s",
  }),
  input: { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "9px 12px", color: "#e8eaed", fontSize: 14, outline: "none", boxSizing: "border-box" },
  select: { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "9px 12px", color: "#e8eaed", fontSize: 14, outline: "none", boxSizing: "border-box" },
  label: { fontSize: 12, color: "#8b949e", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" },
  formGroup: { marginBottom: 14 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modalBox: { background: "#161b22", border: "1px solid #30363d", borderRadius: 16, padding: 28, width: 440, maxWidth: "90vw" },
  modalTitle: { fontSize: 17, fontWeight: 700, marginBottom: 20, color: "#e8eaed" },
  taskCard: (overdue) => ({
    background: overdue ? "rgba(239,68,68,0.05)" : "#0d1117",
    border: `1px solid ${overdue ? "rgba(239,68,68,0.3)" : "#21262d"}`,
    borderRadius: 10, padding: "14px 16px", marginBottom: 10
  }),
  statusBadge: (s) => ({
    display: "inline-block", borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 600,
    background: s === "done" ? "rgba(34,197,94,0.15)" : s === "in_progress" ? "rgba(234,179,8,0.15)" : "rgba(148,163,184,0.15)",
    color: s === "done" ? "#4ade80" : s === "in_progress" ? "#fbbf24" : "#94a3b8",
  }),
  error: { color: "#f87171", fontSize: 13, marginTop: 8 },
  emptyState: { textAlign: "center", padding: "48px 0", color: "#8b949e", fontSize: 14 },
  flexBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tag: (color = "blue") => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    background: color === "blue" ? "rgba(88,166,255,0.1)" : "rgba(124,58,237,0.1)",
    color: color === "blue" ? "#58a6ff" : "#a78bfa",
    borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 600
  }),
};

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={S.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ ...S.flexBetween, marginBottom: 20 }}>
          <span style={S.modalTitle}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#8b949e", cursor: "pointer" }}><Icon.X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange, disabled }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      style={{ ...S.select, width: "auto", fontSize: 12, padding: "4px 8px" }}>
      <option value="todo">To Do</option>
      <option value="in_progress">In Progress</option>
      <option value="done">Done</option>
    </select>
  );
}

// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "signup") {
        await api.signup(form);
        setMode("login");
      } else {
        await login(form.email, form.password);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const f = (k) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f1117", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ ...S.modalBox, width: 400, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#58a6ff", marginBottom: 4 }}>
            Task<span style={{ color: "#7c3aed" }}>Flow</span>
          </div>
          <div style={{ fontSize: 13, color: "#8b949e" }}>{mode === "login" ? "Sign in to your workspace" : "Create your account"}</div>
        </div>
        {mode === "signup" && (
          <div style={S.formGroup}>
            <label style={S.label}>Full Name</label>
            <input style={S.input} placeholder="Jane Smith" {...f("name")} />
          </div>
        )}
        <div style={S.formGroup}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="you@example.com" {...f("email")} />
        </div>
        <div style={S.formGroup}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••" {...f("password")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
        </div>
        {mode === "signup" && (
          <div style={S.formGroup}>
            <label style={S.label}>Role</label>
            <select style={S.select} {...f("role")}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        {error && <div style={S.error}>{error}</div>}
        <button style={{ ...S.btn("primary"), width: "100%", justifyContent: "center", marginTop: 16, padding: "11px 16px" }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#8b949e" }}>
          {mode === "login" ? "No account? " : "Already have one? "}
          <span style={{ color: "#58a6ff", cursor: "pointer" }} onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
function Dashboard({ navigate }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    api.getTasks().then(setTasks).catch(() => {});
    api.getProjects().then(setProjects).catch(() => {});
  }, []);

  const overdue = tasks.filter(t => t.overdue);
  const done = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in_progress").length;

  return (
    <div>
      <div style={S.grid(4)}>
        {[
          { label: "Total Tasks", num: tasks.length, color: "#58a6ff" },
          { label: "In Progress", num: inProgress, color: "#fbbf24" },
          { label: "Completed", num: done, color: "#4ade80" },
          { label: "Overdue", num: overdue.length, color: "#f87171" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ ...S.statNum, color: s.color }}>{s.num}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div style={{ ...S.card, borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
          <div style={{ ...S.cardTitle, color: "#f87171" }}>⚠️ Overdue Tasks</div>
          {overdue.slice(0, 5).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(239,68,68,0.1)", fontSize: 13 }}>
              <span>{t.title}</span>
              <span style={{ color: "#f87171" }}>{t.deadline}</span>
            </div>
          ))}
        </div>
      )}

      <div style={S.grid(2)}>
        <div style={S.card}>
          <div style={S.cardTitle}>My Projects ({projects.length})</div>
          {projects.slice(0, 4).map(p => (
            <div key={p.id} style={{ padding: "8px 0", borderBottom: "1px solid #21262d", fontSize: 13, cursor: "pointer", color: "#58a6ff" }}
              onClick={() => navigate("projects")}>
              {p.name}
            </div>
          ))}
          {projects.length === 0 && <div style={{ fontSize: 13, color: "#8b949e" }}>No projects yet</div>}
        </div>
        <div style={S.card}>
          <div style={S.cardTitle}>Recent Tasks</div>
          {tasks.slice(0, 4).map(t => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #21262d", fontSize: 13 }}>
              <span style={{ color: t.overdue ? "#f87171" : "#e8eaed" }}>{t.title}</span>
              <span style={S.statusBadge(t.status)}>{t.status.replace("_", " ")}</span>
            </div>
          ))}
          {tasks.length === 0 && <div style={{ fontSize: 13, color: "#8b949e" }}>No tasks assigned</div>}
        </div>
      </div>
    </div>
  );
}

// ─── PROJECTS PAGE ────────────────────────────────────────────────────────────
function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const load = () => api.getProjects().then(setProjects);
  useEffect(() => { load(); }, []);

  const createProject = async () => {
    setError("");
    try {
      await api.createProject(form);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      load();
    } catch (e) { setError(e.message); }
  };

  const openMembers = async (p) => {
    setShowMembers(p);
    const [users, mems] = await Promise.all([api.getUsers(), api.getMembers(p.id)]);
    setAllUsers(users);
    setMembers(mems);
    setSelectedUsers([]);
  };

  const addMembers = async () => {
    if (!selectedUsers.length) return;
    await api.addMembers(showMembers.id, selectedUsers);
    const mems = await api.getMembers(showMembers.id);
    setMembers(mems);
    setSelectedUsers([]);
  };

  const removeMember = async (uid) => {
    await api.removeMember(showMembers.id, uid);
    setMembers(members.filter(m => m.id !== uid));
  };

  const toggleUser = (uid) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const nonMembers = allUsers.filter(u => !members.find(m => m.id === u.id));

  return (
    <div>
      <div style={S.flexBetween}>
        <span style={{ color: "#8b949e", fontSize: 14 }}>{projects.length} project{projects.length !== 1 ? "s" : ""}</span>
        {user.role === "admin" && (
          <button style={S.btn("primary")} onClick={() => setShowCreate(true)}>
            <Icon.Plus /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 && <div style={S.emptyState}>No projects yet. {user.role === "admin" ? "Create your first project!" : "You haven't been added to any projects."}</div>}

      <div style={S.grid(2)}>
        {projects.map(p => (
          <div key={p.id} style={S.card}>
            <div style={S.cardTitle}>{p.name}</div>
            <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 14 }}>{p.description || "No description"}</div>
            <div style={{ display: "flex", gap: 8 }}>
              {user.role === "admin" && (
                <button style={S.btn("secondary")} onClick={() => openMembers(p)}>
                  <Icon.Team /> Manage Team
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal title="Create Project" onClose={() => setShowCreate(false)}>
          <div style={S.formGroup}>
            <label style={S.label}>Project Name</label>
            <input style={S.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Redesign" />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, height: 80, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What is this project about?" />
          </div>
          {error && <div style={S.error}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={S.btn("secondary")} onClick={() => setShowCreate(false)}>Cancel</button>
            <button style={S.btn("primary")} onClick={createProject}>Create Project</button>
          </div>
        </Modal>
      )}

      {showMembers && (
        <Modal title={`Team: ${showMembers.name}`} onClose={() => setShowMembers(null)}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S.cardTitle, fontSize: 13, marginBottom: 8 }}>Current Members ({members.length})</div>
            {members.map(m => (
              <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #21262d" }}>
                <div>
                  <span style={{ fontSize: 13 }}>{m.name}</span>
                  <span style={{ ...S.rolePill(m.role), marginLeft: 8 }}>{m.role}</span>
                </div>
                {m.id !== user.id && (
                  <button style={S.btn("danger")} onClick={() => removeMember(m.id)}><Icon.Trash /></button>
                )}
              </div>
            ))}
            {members.length === 0 && <div style={{ fontSize: 13, color: "#8b949e" }}>No members yet</div>}
          </div>

          {nonMembers.length > 0 && (
            <div>
              <div style={{ ...S.cardTitle, fontSize: 13, marginBottom: 8 }}>Add Members</div>
              <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid #21262d", borderRadius: 8, marginBottom: 12 }}>
                {nonMembers.map(u => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", cursor: "pointer", background: selectedUsers.includes(u.id) ? "rgba(88,166,255,0.1)" : "transparent" }}
                    onClick={() => toggleUser(u.id)}>
                    <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => {}} style={{ accentColor: "#7c3aed" }} />
                    <span style={{ fontSize: 13 }}>{u.name}</span>
                    <span style={{ fontSize: 11, color: "#8b949e" }}>{u.email}</span>
                    <span style={S.rolePill(u.role)}>{u.role}</span>
                  </div>
                ))}
              </div>
              <button style={{ ...S.btn("primary"), width: "100%", justifyContent: "center" }} onClick={addMembers} disabled={!selectedUsers.length}>
                Add {selectedUsers.length || ""} Member{selectedUsers.length !== 1 ? "s" : ""}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── TASKS PAGE ───────────────────────────────────────────────────────────────
function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", deadline: "", project_id: "", assigned_to: "", assigned_type: "team" });
  const [projectMembers, setProjectMembers] = useState([]);
  const [error, setError] = useState("");

  const load = () => api.getTasks(filterProject || null).then(setTasks);
  useEffect(() => { load(); }, [filterProject]);
  useEffect(() => { api.getProjects().then(setProjects); }, []);

  const loadMembers = async (pid) => {
    if (!pid) { setProjectMembers([]); return; }
    const mems = await api.getMembers(pid);
    setProjectMembers(mems.filter(m => m.role === "member"));
  };

  const createTask = async () => {
    setError("");
    try {
      await api.createTask({
        ...form,
        project_id: parseInt(form.project_id),
        assigned_to: form.assigned_type === "user" ? parseInt(form.assigned_to) : null,
      });
      setShowCreate(false);
      setForm({ title: "", description: "", deadline: "", project_id: "", assigned_to: "", assigned_type: "team" });
      load();
    } catch (e) { setError(e.message); }
  };

  const updateStatus = async (id, status) => {
    await api.updateTask(id, status);
    setTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = async (id) => {
    await api.deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const filtered = tasks.filter(t => !filterStatus || t.status === filterStatus);

  return (
    <div>
      <div style={S.flexBetween}>
        <div style={{ display: "flex", gap: 8 }}>
          <select style={{ ...S.select, width: 160 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select style={{ ...S.select, width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        {user.role === "admin" && (
          <button style={S.btn("primary")} onClick={() => setShowCreate(true)}>
            <Icon.Plus /> New Task
          </button>
        )}
      </div>

      {filtered.length === 0 && <div style={S.emptyState}>No tasks found.</div>}

      {filtered.map(t => (
        <div key={t.id} style={S.taskCard(t.overdue)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                {t.title}
                {t.overdue && <span style={{ ...S.tag("red"), background: "rgba(239,68,68,0.15)", color: "#f87171" }}>⚠ Overdue</span>}
              </div>
              {t.description && <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 6 }}>{t.description}</div>}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={S.statusBadge(t.status)}>{t.status.replace("_", " ")}</span>
                <span style={S.tag("blue")}>{t.project_name}</span>
                <span style={S.tag("purple")}>{t.assigned_type === "team" ? "👥 Team" : `👤 ${t.assignee_name || "User"}`}</span>
                {t.deadline && <span style={{ fontSize: 11, color: t.overdue ? "#f87171" : "#8b949e" }}>📅 {t.deadline}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 12 }}>
              <StatusSelect value={t.status} onChange={(s) => updateStatus(t.id, s)} disabled={false} />
              {user.role === "admin" && (
                <button style={S.btn("danger")} onClick={() => deleteTask(t.id)}><Icon.Trash /></button>
              )}
            </div>
          </div>
        </div>
      ))}

      {showCreate && (
        <Modal title="Create Task" onClose={() => setShowCreate(false)}>
          <div style={S.formGroup}>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Description</label>
            <textarea style={{ ...S.input, height: 60, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={S.grid(2)}>
            <div style={S.formGroup}>
              <label style={S.label}>Project</label>
              <select style={S.select} value={form.project_id} onChange={e => { setForm({ ...form, project_id: e.target.value }); loadMembers(e.target.value); }}>
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div style={S.formGroup}>
              <label style={S.label}>Deadline</label>
              <input style={S.input} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <div style={S.formGroup}>
            <label style={S.label}>Assign To</label>
            <select style={S.select} value={form.assigned_type} onChange={e => setForm({ ...form, assigned_type: e.target.value, assigned_to: "" })}>
              <option value="team">Whole Team</option>
              <option value="user">Specific User</option>
            </select>
          </div>
          {form.assigned_type === "user" && (
            <div style={S.formGroup}>
              <label style={S.label}>Member</label>
              <select style={S.select} value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Select member</option>
                {projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          {error && <div style={S.error}>{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button style={S.btn("secondary")} onClick={() => setShowCreate(false)}>Cancel</button>
            <button style={S.btn("primary")} onClick={createTask}>Create Task</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CALENDAR PAGE ────────────────────────────────────────────────────────────
function CalendarPage() {
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => { api.getTasks().then(setTasks); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const tasksByDate = {};
  tasks.filter(t => t.deadline).forEach(t => {
    if (!tasksByDate[t.deadline]) tasksByDate[t.deadline] = [];
    tasksByDate[t.deadline].push(t);
  });

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div>
      <div style={{ ...S.flexBetween, marginBottom: 20 }}>
        <button style={S.btn("secondary")} onClick={() => setCurrentDate(new Date(year, month - 1))}>← Prev</button>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{monthNames[month]} {year}</span>
        <button style={S.btn("secondary")} onClick={() => setCurrentDate(new Date(year, month + 1))}>Next →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "#21262d", borderRadius: 12, overflow: "hidden" }}>
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} style={{ background: "#161b22", padding: "10px 0", textAlign: "center", fontSize: 11, color: "#8b949e", fontWeight: 600, textTransform: "uppercase" }}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = day ? `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : null;
          const dayTasks = dateStr ? (tasksByDate[dateStr] || []) : [];
          const isToday = dateStr === today;
          return (
            <div key={i} style={{ background: "#161b22", minHeight: 90, padding: 8, opacity: day ? 1 : 0.3 }}>
              {day && (
                <>
                  <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#7c3aed" : "#e8eaed",
                    background: isToday ? "rgba(124,58,237,0.2)" : "transparent", borderRadius: 99,
                    width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                    {day}
                  </div>
                  {dayTasks.map(t => (
                    <div key={t.id} style={{ fontSize: 10, background: t.overdue ? "rgba(239,68,68,0.2)" : "rgba(88,166,255,0.15)",
                      color: t.overdue ? "#f87171" : "#58a6ff", borderRadius: 4, padding: "2px 5px", marginBottom: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TEAM PAGE ────────────────────────────────────────────────────────────────
function TeamPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => { api.getProjects().then(p => { setProjects(p); if (p.length) { setSelectedProject(p[0]); } }); }, []);
  useEffect(() => { if (selectedProject) api.getMembers(selectedProject.id).then(setMembers); }, [selectedProject]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {projects.map(p => (
          <button key={p.id} style={{ ...S.btn(selectedProject?.id === p.id ? "primary" : "secondary") }}
            onClick={() => setSelectedProject(p)}>{p.name}</button>
        ))}
      </div>

      {selectedProject && (
        <div style={S.card}>
          <div style={S.cardTitle}>{selectedProject.name} — Team ({members.length})</div>
          {members.length === 0 && <div style={S.emptyState}>No members in this project yet.</div>}
          <div style={S.grid(3)}>
            {members.map(m => (
              <div key={m.id} style={{ ...S.statCard, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: m.role === "admin" ? "rgba(124,58,237,0.3)" : "rgba(88,166,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: m.role === "admin" ? "#a78bfa" : "#58a6ff" }}>
                  {m.name[0].toUpperCase()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#8b949e" }}>{m.email}</div>
                <span style={S.rolePill(m.role)}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.getReports().then(setData).catch(e => setError(e.message)); }, []);

  if (error) return <div style={{ ...S.emptyState, color: "#f87171" }}>{error}</div>;
  if (!data) return <div style={S.emptyState}>Loading reports...</div>;

  return (
    <div>
      <div style={S.grid(4)}>
        {[
          { label: "Total Tasks", num: data.summary.total_tasks, color: "#58a6ff" },
          { label: "Completed", num: data.summary.total_done, color: "#4ade80" },
          { label: "Overdue", num: data.summary.total_overdue, color: "#f87171" },
          { label: "Completion %", num: `${data.summary.overall_completion_pct}%`, color: "#a78bfa" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ ...S.statNum, color: s.color }}>{s.num}</div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>Project Breakdown</div>
        {data.projects.length === 0 && <div style={S.emptyState}>No project data yet.</div>}
        {data.projects.map(p => (
          <div key={p.project_id} style={{ padding: "16px 0", borderBottom: "1px solid #21262d" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.project_name}</span>
                <span style={{ ...S.tag("blue"), marginLeft: 8 }}>👥 {p.members} members</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 700, color: p.completion_pct >= 80 ? "#4ade80" : p.completion_pct >= 40 ? "#fbbf24" : "#f87171" }}>
                {p.completion_pct}%
              </span>
            </div>
            <div style={{ background: "#21262d", borderRadius: 99, height: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p.completion_pct}%`, background: p.completion_pct >= 80 ? "#4ade80" : p.completion_pct >= 40 ? "#fbbf24" : "#7c3aed", borderRadius: 99, transition: "width 0.5s" }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#8b949e" }}>
              <span>✅ {p.done} done</span>
              <span>🔄 {p.in_progress} in progress</span>
              <span>📋 {p.todo} todo</span>
              {p.overdue > 0 && <span style={{ color: "#f87171" }}>⚠️ {p.overdue} overdue</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("dashboard");

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icon.Dashboard },
    { id: "projects", label: "Projects", icon: Icon.Project },
    { id: "tasks", label: "Tasks", icon: Icon.Task },
    { id: "calendar", label: "Calendar", icon: Icon.Calendar },
    { id: "team", label: "Team", icon: Icon.Team },
    ...(user?.role === "admin" ? [{ id: "reports", label: "Reports", icon: Icon.Report }] : []),
  ];

  const pages = {
    dashboard: <Dashboard navigate={setPage} />,
    projects: <Projects />,
    tasks: <Tasks />,
    calendar: <CalendarPage />,
    team: <TeamPage />,
    reports: <Reports />,
  };

  const pageTitle = navItems.find(n => n.id === page)?.label || "Dashboard";

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={S.sidebar}>
        <div style={S.logo}>Task<span style={S.logoSpan}>Flow</span></div>
        {navItems.map(n => (
          <div key={n.id} style={S.navItem(page === n.id)} onClick={() => setPage(n.id)}>
            <n.icon />{n.label}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ padding: "0 20px" }}>
          <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 8 }}>{user?.name}</div>
          <button style={{ ...S.btn("secondary"), width: "100%", justifyContent: "center", fontSize: 12 }} onClick={logout}>
            <Icon.Logout /> Sign Out
          </button>
        </div>
      </div>
      <div style={S.main}>
        <div style={S.topbar}>
          <span style={S.pageTitle}>{pageTitle}</span>
          <div style={S.userBadge}>
            <span>{user?.name}</span>
            <span style={S.rolePill(user?.role)}>{user?.role}</span>
          </div>
        </div>
        <div style={S.content}>{pages[page]}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: "100vh", background: "#0f1117", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b949e", fontFamily: "'DM Sans', sans-serif" }}>
      Loading...
    </div>
  );
  return user ? <AppShell /> : <AuthPage />;
}