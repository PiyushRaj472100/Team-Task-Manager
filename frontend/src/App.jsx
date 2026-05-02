import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('login');
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchCurrentUser();
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      await fetchCurrentUser();
      setCurrentView('dashboard');
    } catch (error) {
      alert('Login failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      await axios.post('/api/auth/signup', { name, email, password, role });
      alert('Account created successfully! Please login.');
      setCurrentView('login');
    } catch (error) {
      alert('Signup failed: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentView('login');
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get('/api/reports');
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const createProject = async (name, description) => {
    try {
      await axios.post('/api/projects', { name, description });
      fetchProjects();
      alert('Project created successfully!');
    } catch (error) {
      alert('Failed to create project: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const createTask = async (title, description, deadline, projectId, assignedTo, assignedType) => {
    try {
      await axios.post('/api/tasks', {
        title,
        description,
        deadline,
        project_id: projectId,
        assigned_to: assignedTo,
        assigned_type: assignedType
      });
      fetchTasks();
      alert('Task created successfully!');
    } catch (error) {
      alert('Failed to create task: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await axios.put(`/api/tasks/${taskId}`, { status });
      fetchTasks();
    } catch (error) {
      alert('Failed to update task: ' + (error.response?.data?.detail || 'Unknown error'));
    }
  };

  const deleteTask = async (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`/api/tasks/${taskId}`);
        fetchTasks();
        alert('Task deleted successfully!');
      } catch (error) {
        alert('Failed to delete task: ' + (error.response?.data?.detail || 'Unknown error'));
      }
    }
  };

  // Login Component
  const Login = () => (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2 className="text-center mb-3">Login to TaskFlow</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          const email = e.target.email.value;
          const password = e.target.password.value;
          login(email, password);
        }}>
          <input type="email" name="email" className="input" placeholder="Email" required />
          <input type="password" name="password" className="input" placeholder="Password" required />
          <button type="submit" className="btn" style={{ width: '100%' }}>Login</button>
        </form>
        <p className="text-center mt-3">
          Don't have an account? 
          <button onClick={() => setCurrentView('signup')} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );

  // Signup Component
  const Signup = () => (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2 className="text-center mb-3">Sign Up for TaskFlow</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          const name = e.target.name.value;
          const email = e.target.email.value;
          const password = e.target.password.value;
          const role = e.target.role.value;
          signup(name, email, password, role);
        }}>
          <input type="text" name="name" className="input" placeholder="Full Name" required />
          <input type="email" name="email" className="input" placeholder="Email" required />
          <input type="password" name="password" className="input" placeholder="Password" required />
          <select name="role" className="input">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn" style={{ width: '100%' }}>Sign Up</button>
        </form>
        <p className="text-center mt-3">
          Already have an account? 
          <button onClick={() => setCurrentView('login')} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
            Login
          </button>
        </p>
      </div>
    </div>
  );

  // Dashboard Component
  const Dashboard = () => {
    useEffect(() => {
      if (currentView === 'dashboard') {
        fetchProjects();
        fetchTasks();
        if (user?.role === 'admin') {
          fetchReports();
        }
      }
    }, [currentView]);

    return (
      <div>
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TaskFlow</div>
            <div className="nav-links">
              <button onClick={() => setCurrentView('dashboard')} className="nav-link">Dashboard</button>
              {user?.role === 'admin' && (
                <>
                  <button onClick={() => setCurrentView('projects')} className="nav-link">Projects</button>
                  <button onClick={() => setCurrentView('tasks')} className="nav-link">Tasks</button>
                  <button onClick={() => setCurrentView('reports')} className="nav-link">Reports</button>
                </>
              )}
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </nav>

        <div className="container">
          <h1>Welcome, {user?.name}!</h1>
          <p>Role: <strong>{user?.role}</strong></p>
          
          <div className="grid">
            <div className="card">
              <h3>Total Projects</h3>
              <h2>{projects.length}</h2>
            </div>
            <div className="card">
              <h3>Total Tasks</h3>
              <h2>{tasks.length}</h2>
            </div>
            {user?.role === 'admin' && reports && (
              <>
                <div className="card">
                  <h3>Completion Rate</h3>
                  <h2>{reports.completion_rate.toFixed(1)}%</h2>
                </div>
                <div className="card">
                  <h3>Overdue Tasks</h3>
                  <h2 className="overdue">{reports.overdue_count}</h2>
                </div>
              </>
            )}
          </div>

          <div className="card mt-3">
            <h3>Recent Tasks</h3>
            {tasks.slice(0, 5).map(task => (
              <div key={task.id} className="task-card">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`status-badge status-${task.status}`}>{task.status}</span>
                  {task.deadline && (
                    <span style={{ marginLeft: '10px' }}>
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {task.overdue && <span className="overdue ml-2">⚠️ Overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Projects Component
  const Projects = () => {
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
      fetchProjects();
    }, []);

    return (
      <div>
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TaskFlow</div>
            <div className="nav-links">
              <button onClick={() => setCurrentView('dashboard')} className="nav-link">Dashboard</button>
              <button onClick={() => setCurrentView('projects')} className="nav-link">Projects</button>
              <button onClick={() => setCurrentView('tasks')} className="nav-link">Tasks</button>
              <button onClick={() => setCurrentView('reports')} className="nav-link">Reports</button>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </nav>

        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1>Projects</h1>
            <button onClick={() => setShowCreateForm(true)} className="btn">Create Project</button>
          </div>

          {showCreateForm && (
            <div className="card">
              <h3>Create New Project</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.name.value;
                const description = e.target.description.value;
                createProject(name, description);
                setShowCreateForm(false);
              }}>
                <input type="text" name="name" className="input" placeholder="Project Name" required />
                <textarea name="description" className="input" placeholder="Description (optional)" rows="3"></textarea>
                <button type="submit" className="btn">Create</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="grid">
            {projects.map(project => (
              <div key={project.id} className="card">
                <h3>{project.name}</h3>
                <p>{project.description || 'No description'}</p>
                <small>Created by: {project.created_by}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Tasks Component
  const Tasks = () => {
    const [showCreateForm, setShowCreateForm] = useState(false);

    useEffect(() => {
      fetchTasks();
      fetchProjects();
    }, []);

    return (
      <div>
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TaskFlow</div>
            <div className="nav-links">
              <button onClick={() => setCurrentView('dashboard')} className="nav-link">Dashboard</button>
              <button onClick={() => setCurrentView('projects')} className="nav-link">Projects</button>
              <button onClick={() => setCurrentView('tasks')} className="nav-link">Tasks</button>
              <button onClick={() => setCurrentView('reports')} className="nav-link">Reports</button>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </nav>

        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h1>Tasks</h1>
            <button onClick={() => setShowCreateForm(true)} className="btn">Create Task</button>
          </div>

          {showCreateForm && (
            <div className="card">
              <h3>Create New Task</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const title = e.target.title.value;
                const description = e.target.description.value;
                const deadline = e.target.deadline.value;
                const projectId = parseInt(e.target.projectId.value);
                const assignedTo = e.target.assignedTo.value ? parseInt(e.target.assignedTo.value) : null;
                const assignedType = e.target.assignedType.value;
                createTask(title, description, deadline, projectId, assignedTo, assignedType);
                setShowCreateForm(false);
              }}>
                <input type="text" name="title" className="input" placeholder="Task Title" required />
                <textarea name="description" className="input" placeholder="Description (optional)" rows="3"></textarea>
                <input type="date" name="deadline" className="input" />
                <select name="projectId" className="input" required>
                  <option value="">Select Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <select name="assignedType" className="input">
                  <option value="user">Assign to User</option>
                  <option value="team">Assign to Team</option>
                </select>
                <input type="number" name="assignedTo" className="input" placeholder="User ID (if assigned to user)" />
                <button type="submit" className="btn">Create</button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                  Cancel
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h3>All Tasks</h3>
            {tasks.map(task => (
              <div key={task.id} className="task-card">
                <div className="task-title">{task.title}</div>
                <div className="task-meta">
                  <span className={`status-badge status-${task.status}`}>{task.status}</span>
                  {task.deadline && (
                    <span style={{ marginLeft: '10px' }}>
                      Deadline: {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  )}
                  {task.overdue && <span className="overdue ml-2">⚠️ Overdue</span>}
                  <span style={{ marginLeft: '10px' }}>Type: {task.assigned_type}</span>
                </div>
                {task.description && <p style={{ marginTop: '10px' }}>{task.description}</p>}
                <div style={{ marginTop: '10px' }}>
                  {user?.role === 'admin' && (
                    <>
                      <select 
                        value={task.status} 
                        onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                        style={{ marginRight: '10px' }}
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="done">Done</option>
                      </select>
                      <button onClick={() => deleteTask(task.id)} className="btn btn-secondary">Delete</button>
                    </>
                  )}
                  {user?.role === 'member' && task.status !== 'done' && (
                    <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="btn">
                      Mark In Progress
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Reports Component
  const Reports = () => {
    useEffect(() => {
      fetchReports();
    }, []);

    if (!reports) return <div>Loading...</div>;

    return (
      <div>
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">TaskFlow</div>
            <div className="nav-links">
              <button onClick={() => setCurrentView('dashboard')} className="nav-link">Dashboard</button>
              <button onClick={() => setCurrentView('projects')} className="nav-link">Projects</button>
              <button onClick={() => setCurrentView('tasks')} className="nav-link">Tasks</button>
              <button onClick={() => setCurrentView('reports')} className="nav-link">Reports</button>
              <button onClick={logout} className="btn btn-secondary">Logout</button>
            </div>
          </div>
        </nav>

        <div className="container">
          <h1>Reports</h1>
          
          <div className="grid">
            <div className="card">
              <h3>Completion Rate</h3>
              <h2>{reports.completion_rate.toFixed(1)}%</h2>
              <p>{reports.completed_tasks} of {reports.total_tasks} tasks completed</p>
            </div>
            <div className="card">
              <h3>Overdue Tasks</h3>
              <h2 className="overdue">{reports.overdue_count}</h2>
              <p>Tasks past their deadline</p>
            </div>
          </div>

          <div className="card mt-3">
            <h3>Project Statistics</h3>
            {reports.project_stats.map(project => (
              <div key={project.name} className="task-card">
                <h4>{project.name}</h4>
                <div className="task-meta">
                  <span>Total Tasks: {project.task_count}</span>
                  <span style={{ marginLeft: '20px' }}>
                    Completed: {project.completed_count}
                  </span>
                  <span style={{ marginLeft: '20px' }}>
                    Rate: {project.task_count > 0 ? ((project.completed_count / project.task_count) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Main render logic
  if (!token) {
    return currentView === 'login' ? <Login /> : <Signup />;
  }

  if (!user) {
    return <div className="container text-center" style={{ marginTop: '100px' }}>
      <h2>Loading...</h2>
    </div>;
  }

  switch (currentView) {
    case 'dashboard':
      return <Dashboard />;
    case 'projects':
      return user.role === 'admin' ? <Projects /> : <Dashboard />;
    case 'tasks':
      return user.role === 'admin' ? <Tasks /> : <Dashboard />;
    case 'reports':
      return user.role === 'admin' ? <Reports /> : <Dashboard />;
    default:
      return <Dashboard />;
  }
}

export default App;
