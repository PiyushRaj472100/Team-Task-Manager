# TaskFlow — Project Management System

Full-stack task management app with role-based access control.

**Stack:** Python (FastAPI) · React (Vite) · SQLite

---

## 🚀 Quick Start

### Terminal 1 — Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
API runs at: http://localhost:8000  
Swagger docs: http://localhost:8000/docs

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at: http://localhost:5173

---

## 🗄️ Database Schema

### users
| Column   | Type    | Notes                        |
|----------|---------|------------------------------|
| id       | INTEGER | Primary Key                  |
| name     | TEXT    | Full name                    |
| email    | TEXT    | Unique                       |
| password | TEXT    | Bcrypt hashed                |
| role     | TEXT    | `admin` or `member`          |

### projects
| Column      | Type    | Notes              |
|-------------|---------|-------------------|
| id          | INTEGER | Primary Key        |
| name        | TEXT    |                   |
| description | TEXT    | Nullable           |
| created_by  | INTEGER | FK → users.id      |

### project_members (Team System)
| Column     | Type    | Notes                   |
|------------|---------|------------------------|
| id         | INTEGER | Primary Key             |
| user_id    | INTEGER | FK → users.id           |
| project_id | INTEGER | FK → projects.id        |

> **This is the team.** No separate teams table needed.  
> Many-to-many: users ↔ projects via this join table.

### tasks
| Column        | Type    | Notes                          |
|---------------|---------|-------------------------------|
| id            | INTEGER | Primary Key                    |
| title         | TEXT    |                               |
| description   | TEXT    | Nullable                       |
| status        | TEXT    | `todo` / `in_progress` / `done` |
| deadline      | TEXT    | ISO date string (YYYY-MM-DD)   |
| project_id    | INTEGER | FK → projects.id               |
| assigned_to   | INTEGER | FK → users.id, NULL for team   |
| assigned_type | TEXT    | `user` or `team`               |
| created_by    | INTEGER | FK → users.id (admin)          |

---

## 🔗 API Endpoints

### Auth
```
POST /api/auth/signup    — Register
POST /api/auth/login     — Login → JWT token
GET  /api/auth/me        — Current user info
```

### Projects (Admin only for write)
```
POST /api/projects                      — Create project
GET  /api/projects                      — List (role-filtered)
POST /api/projects/{id}/members         — Add team members
GET  /api/projects/{id}/members         — List team
DELETE /api/projects/{id}/members/{uid} — Remove member
```

### Tasks
```
POST   /api/tasks           — Create task (admin)
GET    /api/tasks           — List (role + visibility filtered)
PUT    /api/tasks/{id}      — Update status (member/admin)
DELETE /api/tasks/{id}      — Delete (admin only)
```

### Reports (Admin only)
```
GET /api/reports  — Completion %, overdue count, per-project stats
```

---

## 🧠 Core Logic

### Task Visibility
```python
# If assigned to team → all project members see it
# If assigned to user → only that user sees it

if assigned_type == "team":
    show to all project_members of that project
elif assigned_type == "user":
    show only to assigned_to user
```

### Overdue Detection
```python
if task.deadline < today and task.status != "done":
    task.overdue = True  # shown as ⚠️
```

### Role Guard (Backend)
```python
def require_admin(current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin access required")
```

---

## 👤 Roles

| Feature              | Admin | Member |
|----------------------|-------|--------|
| Create project       | ✅    | ❌     |
| Add members          | ✅    | ❌     |
| Create/delete tasks  | ✅    | ❌     |
| Update task status   | ✅    | ✅     |
| View own tasks       | ✅    | ✅     |
| View reports         | ✅    | ❌     |
| View calendar        | ✅    | ✅     |

---

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── main.py          # FastAPI app, CORS, startup
│   ├── database.py      # SQLite init, schema
│   ├── auth.py          # JWT, bcrypt, guards
│   ├── routes.py        # All API endpoints
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   └── App.jsx      # Complete React app (single file)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── start_backend.sh
├── start_frontend.sh
└── README.md
```

---

## 🎯 Interview Talking Points

**"How did you implement teams?"**
> "Each project has a many-to-many relationship with users via a `project_members` join table. No separate team entity is needed — the team IS the set of members for a project. This lets users belong to multiple projects across different admins."

**"How do you handle task visibility?"**
> "Tasks have an `assigned_type` field: `team` or `user`. When fetching, the SQL query filters accordingly — team tasks show to all project members via a JOIN on `project_members`, user tasks filter by `assigned_to = current_user_id`."

**"How does auth work?"**
> "JWT tokens signed with HS256. On login, we issue a token containing user ID, name, email, and role. FastAPI dependency injection validates the token on every protected route. Role checks happen at the endpoint level using a `require_admin` dependency."
