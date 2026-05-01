# 📌 TaskFlow — Team Task Manager

A full-stack web app for managing team projects and tasks with role-based access control.

## 🚀 Features

- **Authentication** — JWT-based signup/login with bcrypt password hashing
- **Projects** — Create projects, invite team members, manage via color-coded cards
- **Role-Based Access** — Admin (full CRUD) vs Member (limited to own tasks)
- **Tasks** — Kanban board with Todo / In Progress / Review / Done columns
- **Task Details** — Priority levels, due dates, assignee, descriptions
- **Dashboard** — Stats overview (total, in-progress, overdue, completed) + recent activity table
- **Team Management** — Add/remove members by email, assign Admin/Member roles

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Frontend | Vanilla HTML/CSS/JS (SPA) |
| Deployment | Railway |

## 📁 Project Structure

```
team-task-manager/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── middleware/
│   │   └── auth.js            # JWT protect middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js            # POST /register, POST /login, GET /me
│   │   ├── projects.js        # CRUD + member management
│   │   ├── tasks.js           # CRUD + dashboard summary
│   │   └── users.js           # Search, update profile
│   └── server.js
├── frontend/
│   └── public/
│       └── index.html         # Full SPA (no framework)
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## ⚙️ Setup & Run Locally

### 1. Clone & Install
```bash
git clone <your-repo>
cd team-task-manager
npm install
```

### 2. Environment Variables
```bash
cp backend/.env.example .env
# Edit .env with your values:
# MONGO_URI=mongodb+srv://...
# JWT_SECRET=your_secret_key
```

### 3. Run
```bash
npm run dev   # Development (nodemon)
npm start     # Production
```

App runs at `http://localhost:5000`

## 🌐 Deploy on Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **MongoDB** service (or use MongoDB Atlas free tier)
4. Set environment variables in Railway dashboard:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — any long random string
5. Railway auto-detects Node.js and runs `npm start`

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Sign up |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |

### Projects
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List my projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update (Admin) |
| DELETE | `/api/projects/:id` | Delete (Admin) |
| POST | `/api/projects/:id/members` | Add member (Admin) |
| DELETE | `/api/projects/:id/members/:userId` | Remove member (Admin) |

### Tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tasks?project=:id` | List tasks for project |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/:id` | Get task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| GET | `/api/tasks/dashboard/summary` | Dashboard stats |

## 🔐 Role Permissions

| Action | Admin | Member |
|---|---|---|
| Create/edit any task | ✅ | ❌ |
| Update own/assigned tasks | ✅ | ✅ |
| Add/remove members | ✅ | ❌ |
| Delete project | ✅ | ❌ |
| View tasks | ✅ | ✅ |
