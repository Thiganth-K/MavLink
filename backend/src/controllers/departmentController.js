import Department from '../models/Department.js';
import logger from '../utils/logger.js';

// Create Department
export const createDepartment = async (req, res) => {
  const start = Date.now();
  logger.debug('createDepartment start', { body: req.body });
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const { deptId, deptName } = req.body;
    if (!deptId || !deptName) return res.status(400).json({ message: 'deptId and deptName are required' });
    const existing = await Department.findOne({ deptId });
    if (existing) return res.status(409).json({ message: 'Department ID already exists' });
    const dept = await Department.create({ deptId, deptName });
    logger.info('createDepartment success', { durationMs: Date.now() - start, deptId });
    res.status(201).json({ message: 'Department created', department: dept });
  } catch (err) {
    logger.error('createDepartment error', { error: err.message });
    res.status(500).json({ message: 'Failed to create department', error: err.message });
  }
};

// List Departments
export const listDepartments = async (_req, res) => {
  const start = Date.now();
  logger.debug('listDepartments start');
  try {
    const depts = await Department.find().sort({ deptId: 1 });
    logger.info('listDepartments success', { durationMs: Date.now() - start, count: depts.length });
    res.json(depts);
  } catch (err) {
    logger.error('listDepartments error', { error: err.message });
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};

// Get one
export const getDepartment = async (req, res) => {
  const start = Date.now();
  logger.debug('getDepartment start', { deptId: req.params.deptId });
  try {
    const dept = await Department.findOne({ deptId: req.params.deptId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    logger.info('getDepartment success', { durationMs: Date.now() - start, deptId: req.params.deptId });
    res.json(dept);
  } catch (err) {
    logger.error('getDepartment error', { error: err.message });
    res.status(500).json({ message: 'Failed to fetch department' });
  }
};

// Update deptName only
export const updateDepartment = async (req, res) => {
  const start = Date.now();
  logger.debug('updateDepartment start', { deptId: req.params.deptId, bodyKeys: Object.keys(req.body || {}) });
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const { deptName } = req.body;
    if (!deptName) return res.status(400).json({ message: 'deptName required' });
    const dept = await Department.findOneAndUpdate({ deptId: req.params.deptId }, { deptName }, { new: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    logger.info('updateDepartment success', { durationMs: Date.now() - start, deptId: req.params.deptId });
    res.json({ message: 'Department updated', department: dept });
  } catch (err) {
    logger.error('updateDepartment error', { error: err.message });
    res.status(500).json({ message: 'Failed to update department' });
  }
};

// Delete
export const deleteDepartment = async (req, res) => {
  const start = Date.now();
  logger.debug('deleteDepartment start', { deptId: req.params.deptId });
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const dept = await Department.findOne({ deptId: req.params.deptId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.deleteOne();
    logger.info('deleteDepartment success', { durationMs: Date.now() - start, deptId: req.params.deptId });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    logger.error('deleteDepartment error', { error: err.message });
    res.status(500).json({ message: 'Failed to delete department' });
  }
};
