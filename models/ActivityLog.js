const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'read', 'login', 'export']
  },
  entity: {
    type: String,
    required: true,
    enum: ['contact', 'contract', 'invoice', 'finance', 'user', 'auth']
  },
  entityId: { type: String },
  entityLabel: { type: String },
  user: { type: String, default: 'Admin' },
  ip: { type: String },
  details: { type: String },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ entity: 1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
