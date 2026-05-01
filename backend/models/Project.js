const mongoose = require('mongoose');

const MemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Member'],
    default: 'Member'
  }
});

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    default: '#6366f1'
  },
  members: [MemberSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Ensure creator is always an Admin member
ProjectSchema.pre('save', function (next) {
  if (this.isNew) {
    const alreadyMember = this.members.some(
      m => m.user.toString() === this.createdBy.toString()
    );
    if (!alreadyMember) {
      this.members.push({ user: this.createdBy, role: 'Admin' });
    }
  }
  next();
});

// Virtual: get Admin members
ProjectSchema.virtual('admins').get(function () {
  return this.members.filter(m => m.role === 'Admin').map(m => m.user);
});

module.exports = mongoose.model('Project', ProjectSchema);
