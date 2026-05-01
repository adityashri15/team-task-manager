const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

router.use(protect);

// Helper: check project membership
const getProjectAndCheckAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return { error: 'Project not found', status: 404 };
  const member = project.members.find(m => m.user.toString() === userId.toString());
  if (!member) return { error: 'Access denied', status: 403 };
  return { project, member };
};

// GET /api/tasks?project=:id - Get tasks for a project
router.get('/', async (req, res) => {
  try {
    const { project: projectId, status, priority, assignedTo } = req.query;
    if (!projectId) return res.status(400).json({ success: false, message: 'project query param required' });

    const { error, status: errStatus } = await getProjectAndCheckAccess(projectId, req.user._id);
    if (error) return res.status(errStatus).json({ success: false, message: error });

    const filter = { project: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks - Create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('project').notEmpty().withMessage('Project ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { title, description, status, priority, project: projectId, assignedTo, dueDate, tags } = req.body;

    const { error, errStatus, member } = await getProjectAndCheckAccess(projectId, req.user._id);
    if (error) return res.status(errStatus || 403).json({ success: false, message: error });

    const task = await Task.create({
      title, description, status, priority,
      project: projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      dueDate: dueDate || null,
      tags: tags || []
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status } = await getProjectAndCheckAccess(task.project._id, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status, member } = await getProjectAndCheckAccess(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const isAdmin = member && member.role === 'Admin';
    const isCreator = task.createdBy.toString() === req.user._id.toString();
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    // Members can only update status of their own tasks; Admins can update anything
    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this task' });
    }

    const allowed = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate', 'tags'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:id - Delete task (Admin or Creator)
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { error, status, member } = await getProjectAndCheckAccess(task.project, req.user._id);
    if (error) return res.status(status).json({ success: false, message: error });

    const isAdmin = member && member.role === 'Admin';
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/dashboard/summary - Dashboard stats
router.get('/dashboard/summary', async (req, res) => {
  try {
    // All projects the user is part of
    const Project = require('../models/Project');
    const projects = await Project.find({ 'members.user': req.user._id });
    const projectIds = projects.map(p => p._id);

    const [total, todo, inProgress, review, done, overdue, myTasks] = await Promise.all([
      Task.countDocuments({ project: { $in: projectIds } }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'Todo' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'In Progress' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'Review' }),
      Task.countDocuments({ project: { $in: projectIds }, status: 'Done' }),
      Task.countDocuments({
        project: { $in: projectIds },
        status: { $ne: 'Done' },
        dueDate: { $lt: new Date() }
      }),
      Task.countDocuments({ assignedTo: req.user._id, status: { $ne: 'Done' } })
    ]);

    // Recent tasks
    const recentTasks = await Task.find({ project: { $in: projectIds } })
      .populate('assignedTo', 'name email')
      .populate('project', 'name color')
      .sort({ updatedAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: { total, todo, inProgress, review, done, overdue, myTasks },
      recentTasks,
      projectCount: projects.length
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
