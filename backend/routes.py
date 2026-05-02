from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
import sqlite3
from auth import get_current_user, require_admin, create_user, authenticate_user, create_access_token, UserCreate, UserLogin, Token, get_password_hash

router = APIRouter()

# Pydantic models
class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Project(BaseModel):
    id: int
    name: str
    description: Optional[str]
    created_by: int

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    project_id: int
    assigned_to: Optional[int] = None
    assigned_type: str = "user"

class Task(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    deadline: Optional[str]
    project_id: int
    assigned_to: Optional[int]
    assigned_type: str
    created_by: int
    overdue: bool = False

class ProjectMember(BaseModel):
    user_id: int
    project_id: int

# Auth routes
@router.post("/api/auth/signup", response_model=dict)
async def signup(user: UserCreate):
    return create_user(user)

@router.post("/api/auth/login", response_model=Token)
async def login(user_credentials: UserLogin):
    user = authenticate_user(user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user["id"])})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Project routes
@router.post("/api/projects", response_model=dict)
async def create_project(project: ProjectCreate, current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)",
        (project.name, project.description, current_user["id"])
    )
    project_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": project_id, "name": project.name, "description": project.description, "created_by": current_user["id"]}

@router.get("/api/projects", response_model=List[dict])
async def get_projects(current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("taskflow.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if current_user["role"] == "admin":
        cursor.execute("SELECT * FROM projects")
    else:
        cursor.execute("""
            SELECT p.* FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ?
        """, (current_user["id"],))
    
    projects = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return projects

@router.post("/api/projects/{project_id}/members", response_model=dict)
async def add_project_member(project_id: int, member: ProjectMember, current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    
    # Verify project exists
    cursor.execute("SELECT id FROM projects WHERE id = ?", (project_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Add member
    cursor.execute(
        "INSERT OR IGNORE INTO project_members (user_id, project_id) VALUES (?, ?)",
        (member.user_id, project_id)
    )
    conn.commit()
    conn.close()
    return {"message": "Member added successfully"}

@router.get("/api/projects/{project_id}/members", response_model=List[dict])
async def get_project_members(project_id: int, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("taskflow.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Verify user has access to project
    if current_user["role"] != "admin":
        cursor.execute("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?", 
                      (project_id, current_user["id"]))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
    
    cursor.execute("""
        SELECT u.id, u.name, u.email, u.role
        FROM users u
        JOIN project_members pm ON u.id = pm.user_id
        WHERE pm.project_id = ?
    """, (project_id,))
    
    members = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return members

@router.delete("/api/projects/{project_id}/members/{user_id}")
async def remove_project_member(project_id: int, user_id: int, current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM project_members WHERE project_id = ? AND user_id = ?", (project_id, user_id))
    conn.commit()
    conn.close()
    return {"message": "Member removed successfully"}

# Task routes
@router.post("/api/tasks", response_model=dict)
async def create_task(task: TaskCreate, current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    
    # Verify project exists
    cursor.execute("SELECT id FROM projects WHERE id = ?", (task.project_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Project not found")
    
    cursor.execute(
        """INSERT INTO tasks (title, description, status, deadline, project_id, assigned_to, assigned_type, created_by)
           VALUES (?, ?, 'todo', ?, ?, ?, ?, ?)""",
        (task.title, task.description, task.deadline, task.project_id, task.assigned_to, task.assigned_type, current_user["id"])
    )
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": task_id,
        "title": task.title,
        "description": task.description,
        "status": "todo",
        "deadline": task.deadline,
        "project_id": task.project_id,
        "assigned_to": task.assigned_to,
        "assigned_type": task.assigned_type,
        "created_by": current_user["id"]
    }

@router.get("/api/tasks", response_model=List[dict])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("taskflow.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    if current_user["role"] == "admin":
        cursor.execute("""
            SELECT t.*, 
                   CASE WHEN t.deadline < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as overdue
            FROM tasks t
        """)
    else:
        cursor.execute("""
            SELECT t.*, 
                   CASE WHEN t.deadline < date('now') AND t.status != 'done' THEN 1 ELSE 0 END as overdue
            FROM tasks t
            WHERE (
                t.assigned_type = 'user' AND t.assigned_to = ?
            ) OR (
                t.assigned_type = 'team' AND t.project_id IN (
                    SELECT project_id FROM project_members WHERE user_id = ?
                )
            )
        """, (current_user["id"], current_user["id"]))
    
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks

@router.put("/api/tasks/{task_id}", response_model=dict)
async def update_task(task_id: int, task_update: dict, current_user: dict = Depends(get_current_user)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    
    # Verify task exists and user has access
    if current_user["role"] != "admin":
        cursor.execute("""
            SELECT id FROM tasks 
            WHERE id = ? AND (
                (assigned_type = 'user' AND assigned_to = ?) OR
                (assigned_type = 'team' AND project_id IN (
                    SELECT project_id FROM project_members WHERE user_id = ?
                ))
            )
        """, (task_id, current_user["id"], current_user["id"]))
        if not cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update task
    set_clauses = []
    values = []
    
    if "status" in task_update:
        set_clauses.append("status = ?")
        values.append(task_update["status"])
    
    if set_clauses:
        sql = f"UPDATE tasks SET {', '.join(set_clauses)} WHERE id = ?"
        values.append(task_id)
        cursor.execute(sql, values)
        conn.commit()
    
    conn.close()
    return {"message": "Task updated successfully"}

@router.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return {"message": "Task deleted successfully"}

# Reports route (admin only)
@router.get("/api/reports")
async def get_reports(current_user: dict = Depends(require_admin)):
    conn = sqlite3.connect("taskflow.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Get completion percentage
    cursor.execute("SELECT COUNT(*) as total FROM tasks")
    total_tasks = cursor.fetchone()["total"]
    
    cursor.execute("SELECT COUNT(*) as completed FROM tasks WHERE status = 'done'")
    completed_tasks = cursor.fetchone()["completed"]
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Get overdue count
    cursor.execute("""
        SELECT COUNT(*) as overdue FROM tasks 
        WHERE deadline < date('now') AND status != 'done'
    """)
    overdue_count = cursor.fetchone()["overdue"]
    
    # Get per-project stats
    cursor.execute("""
        SELECT p.name, COUNT(t.id) as task_count,
               COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_count
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        GROUP BY p.id, p.name
    """)
    
    project_stats = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {
        "completion_rate": completion_rate,
        "overdue_count": overdue_count,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "project_stats": project_stats
    }
