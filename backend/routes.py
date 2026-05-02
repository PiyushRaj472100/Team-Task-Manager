from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_db
from auth import hash_password, verify_password, create_access_token, get_current_user, require_admin
from datetime import date

router = APIRouter()

# ─── MODELS ─────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "member"

class LoginRequest(BaseModel):
    email: str
    password: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class AddMembersRequest(BaseModel):
    user_ids: list[int]

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    project_id: int
    assigned_to: Optional[int] = None
    assigned_type: str  # "user" or "team"

class TaskUpdate(BaseModel):
    status: str

# ─── AUTH ────────────────────────────────────────────────────────────────────

@router.post("/auth/signup")
def signup(req: SignupRequest):
    db = get_db()
    existing = db.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        raise HTTPException(400, "Email already registered")
    if req.role not in ("admin", "member"):
        raise HTTPException(400, "Role must be admin or member")
    hashed = hash_password(req.password)
    db.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
               (req.name, req.email, hashed, req.role))
    db.commit()
    db.close()
    return {"message": "Account created successfully"}

@router.post("/auth/login")
def login(req: LoginRequest):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    db.close()
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token({
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    })
    return {"access_token": token, "user": {"id": user["id"], "name": user["name"], "role": user["role"]}}

@router.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user

# ─── USERS ───────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(current_user=Depends(require_admin)):
    db = get_db()
    users = db.execute("SELECT id, name, email, role FROM users").fetchall()
    db.close()
    return [dict(u) for u in users]

# ─── PROJECTS ────────────────────────────────────────────────────────────────

@router.post("/projects")
def create_project(req: ProjectCreate, current_user=Depends(require_admin)):
    db = get_db()
    cur = db.execute(
        "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)",
        (req.name, req.description, current_user["id"])
    )
    project_id = cur.lastrowid
    # Admin is also a member of their own project
    db.execute("INSERT OR IGNORE INTO project_members (user_id, project_id) VALUES (?, ?)",
               (current_user["id"], project_id))
    db.commit()
    db.close()
    return {"id": project_id, "message": "Project created"}

@router.get("/projects")
def list_projects(current_user=Depends(get_current_user)):
    db = get_db()
    if current_user["role"] == "admin":
        projects = db.execute(
            "SELECT p.*, u.name as creator_name FROM projects p JOIN users u ON p.created_by = u.id WHERE p.created_by = ?",
            (current_user["id"],)
        ).fetchall()
    else:
        projects = db.execute(
            """SELECT p.*, u.name as creator_name FROM projects p 
               JOIN users u ON p.created_by = u.id
               JOIN project_members pm ON pm.project_id = p.id 
               WHERE pm.user_id = ?""",
            (current_user["id"],)
        ).fetchall()
    db.close()
    return [dict(p) for p in projects]

@router.get("/projects/{project_id}")
def get_project(project_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    project = db.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not project:
        raise HTTPException(404, "Project not found")
    # Check access
    if current_user["role"] == "member":
        member = db.execute(
            "SELECT id FROM project_members WHERE user_id = ? AND project_id = ?",
            (current_user["id"], project_id)
        ).fetchone()
        if not member:
            raise HTTPException(403, "Access denied")
    db.close()
    return dict(project)

@router.post("/projects/{project_id}/members")
def add_members(project_id: int, req: AddMembersRequest, current_user=Depends(require_admin)):
    db = get_db()
    project = db.execute("SELECT id FROM projects WHERE id = ? AND created_by = ?",
                         (project_id, current_user["id"])).fetchone()
    if not project:
        raise HTTPException(404, "Project not found or access denied")
    for uid in req.user_ids:
        db.execute("INSERT OR IGNORE INTO project_members (user_id, project_id) VALUES (?, ?)",
                   (uid, project_id))
    db.commit()
    db.close()
    return {"message": f"{len(req.user_ids)} member(s) added"}

@router.get("/projects/{project_id}/members")
def get_members(project_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    members = db.execute(
        """SELECT u.id, u.name, u.email, u.role FROM users u
           JOIN project_members pm ON pm.user_id = u.id
           WHERE pm.project_id = ?""",
        (project_id,)
    ).fetchall()
    db.close()
    return [dict(m) for m in members]

@router.delete("/projects/{project_id}/members/{user_id}")
def remove_member(project_id: int, user_id: int, current_user=Depends(require_admin)):
    db = get_db()
    db.execute("DELETE FROM project_members WHERE project_id = ? AND user_id = ?",
               (project_id, user_id))
    db.commit()
    db.close()
    return {"message": "Member removed"}

# ─── TASKS ───────────────────────────────────────────────────────────────────

@router.post("/tasks")
def create_task(req: TaskCreate, current_user=Depends(require_admin)):
    if req.assigned_type not in ("user", "team"):
        raise HTTPException(400, "assigned_type must be 'user' or 'team'")
    if req.assigned_type == "user" and not req.assigned_to:
        raise HTTPException(400, "assigned_to is required for user tasks")
    db = get_db()
    project = db.execute("SELECT id FROM projects WHERE id = ? AND created_by = ?",
                         (req.project_id, current_user["id"])).fetchone()
    if not project:
        raise HTTPException(404, "Project not found or access denied")
    cur = db.execute(
        """INSERT INTO tasks (title, description, deadline, project_id, assigned_to, assigned_type, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (req.title, req.description, req.deadline, req.project_id,
         req.assigned_to if req.assigned_type == "user" else None,
         req.assigned_type, current_user["id"])
    )
    task_id = cur.lastrowid
    db.commit()
    db.close()
    return {"id": task_id, "message": "Task created"}

@router.get("/tasks")
def list_tasks(project_id: Optional[int] = None, current_user=Depends(get_current_user)):
    db = get_db()
    today = date.today().isoformat()

    if current_user["role"] == "admin":
        query = """
            SELECT t.*, u.name as assignee_name, p.name as project_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            JOIN projects p ON t.project_id = p.id
            WHERE t.created_by = ?
        """
        params = [current_user["id"]]
        if project_id:
            query += " AND t.project_id = ?"
            params.append(project_id)
    else:
        query = """
            SELECT t.*, u.name as assignee_name, p.name as project_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            JOIN projects p ON t.project_id = p.id
            JOIN project_members pm ON pm.project_id = t.project_id
            WHERE pm.user_id = ?
              AND (
                (t.assigned_type = 'team')
                OR (t.assigned_type = 'user' AND t.assigned_to = ?)
              )
        """
        params = [current_user["id"], current_user["id"]]
        if project_id:
            query += " AND t.project_id = ?"
            params.append(project_id)

    tasks = db.execute(query, params).fetchall()
    db.close()

    result = []
    for t in tasks:
        task_dict = dict(t)
        task_dict["overdue"] = (
            bool(task_dict.get("deadline")) and
            task_dict["deadline"] < today and
            task_dict["status"] != "done"
        )
        result.append(task_dict)
    return result

@router.get("/tasks/{task_id}")
def get_task(task_id: int, current_user=Depends(get_current_user)):
    db = get_db()
    task = db.execute(
        "SELECT t.*, u.name as assignee_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?",
        (task_id,)
    ).fetchone()
    if not task:
        raise HTTPException(404, "Task not found")
    db.close()
    return dict(task)

@router.put("/tasks/{task_id}")
def update_task(task_id: int, req: TaskUpdate, current_user=Depends(get_current_user)):
    if req.status not in ("todo", "in_progress", "done"):
        raise HTTPException(400, "Invalid status")
    db = get_db()
    task = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        raise HTTPException(404, "Task not found")
    # Members can only update tasks assigned to them
    if current_user["role"] == "member":
        if not (
            (task["assigned_type"] == "user" and task["assigned_to"] == current_user["id"]) or
            (task["assigned_type"] == "team")
        ):
            raise HTTPException(403, "You can only update your own tasks")
    db.execute("UPDATE tasks SET status = ? WHERE id = ?", (req.status, task_id))
    db.commit()
    db.close()
    return {"message": "Status updated"}

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, current_user=Depends(require_admin)):
    db = get_db()
    db.execute("DELETE FROM tasks WHERE id = ? AND created_by = ?", (task_id, current_user["id"]))
    db.commit()
    db.close()
    return {"message": "Task deleted"}

# ─── REPORTS ─────────────────────────────────────────────────────────────────

@router.get("/reports")
def get_reports(current_user=Depends(require_admin)):
    db = get_db()
    today = date.today().isoformat()

    projects = db.execute(
        "SELECT id, name FROM projects WHERE created_by = ?", (current_user["id"],)
    ).fetchall()

    report = []
    total_tasks = 0
    total_done = 0
    total_overdue = 0

    for project in projects:
        pid = project["id"]
        tasks = db.execute("SELECT * FROM tasks WHERE project_id = ?", (pid,)).fetchall()
        done = sum(1 for t in tasks if t["status"] == "done")
        overdue = sum(1 for t in tasks if t["deadline"] and t["deadline"] < today and t["status"] != "done")
        members_count = db.execute(
            "SELECT COUNT(*) as cnt FROM project_members WHERE project_id = ?", (pid,)
        ).fetchone()["cnt"]

        total_tasks += len(tasks)
        total_done += done
        total_overdue += overdue

        report.append({
            "project_id": pid,
            "project_name": project["name"],
            "total_tasks": len(tasks),
            "done": done,
            "in_progress": sum(1 for t in tasks if t["status"] == "in_progress"),
            "todo": sum(1 for t in tasks if t["status"] == "todo"),
            "overdue": overdue,
            "completion_pct": round((done / len(tasks)) * 100) if tasks else 0,
            "members": members_count
        })

    db.close()
    return {
        "summary": {
            "total_tasks": total_tasks,
            "total_done": total_done,
            "total_overdue": total_overdue,
            "overall_completion_pct": round((total_done / total_tasks) * 100) if total_tasks else 0
        },
        "projects": report
    }