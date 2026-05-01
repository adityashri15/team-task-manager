const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// All routes protected
router.use(protect);

// GET /api/projects - Get all projects for current user
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects - Create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, description, color } = req.body;
    const project = await Project.create({
      name, description, color,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    await project.populate('members.user', 'name email');
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id - Update project (Admin only)
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { name, description, color } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    if (color) project.color = color;

    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id - Delete project (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const member = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!member || member.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:id/members - Add member (Admin only)
router.post('/:id/members', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requester = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { email, role } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyMember = project.members.some(m => m.user.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User is already a member' });

    project.members.push({ user: userToAdd._id, role: role || 'Member' });
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member (Admin only)
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requester = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    project.members = project.members.filter(m => m.user.toString() !== req.params.userId);
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id/members/:userId/role - Change member role (Admin only)
router.put('/:id/members/:userId/role', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const requester = project.members.find(m => m.user.toString() === req.user._id.toString());
    if (!requester || requester.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const member = project.members.find(m => m.user.toString() === req.params.userId);
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' });

    member.role = req.body.role || 'Member';
    await project.save();
    await project.populate('members.user', 'name email');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
