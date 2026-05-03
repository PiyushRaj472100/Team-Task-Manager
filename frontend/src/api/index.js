const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(method, path, body = null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  // Auth
  signup: (data) => request("POST", "/auth/signup", data),
  login: (data) => request("POST", "/auth/login", data),
  me: () => request("GET", "/auth/me"),

  // Users
  getUsers: () => request("GET", "/users"),

  // Projects
  createProject: (data) => request("POST", "/projects", data),
  getProjects: () => request("GET", "/projects"),
  getProject: (id) => request("GET", `/projects/${id}`),
  addMembers: (projectId, user_ids) => request("POST", `/projects/${projectId}/members`, { user_ids }),
  getMembers: (projectId) => request("GET", `/projects/${projectId}/members`),
  removeMember: (projectId, userId) => request("DELETE", `/projects/${projectId}/members/${userId}`),

  // Tasks
  createTask: (data) => request("POST", "/tasks", data),
  getTasks: (projectId = null) => request("GET", `/tasks${projectId ? `?project_id=${projectId}` : ""}`),
  updateTask: (id, status) => request("PUT", `/tasks/${id}`, { status }),
  deleteTask: (id) => request("DELETE", `/tasks/${id}`),

  // Reports
  getReports: () => request("GET", "/reports"),
};