import Department from '../models/Department.js';

// Create Department
export const createDepartment = async (req, res) => {
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const { deptId, deptName } = req.body;
    if (!deptId || !deptName) return res.status(400).json({ message: 'deptId and deptName are required' });
    const existing = await Department.findOne({ deptId });
    if (existing) return res.status(409).json({ message: 'Department ID already exists' });
    const dept = await Department.create({ deptId, deptName });
    res.status(201).json({ message: 'Department created', department: dept });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create department', error: err.message });
  }
};

// List Departments
export const listDepartments = async (_req, res) => {
  try {
    const depts = await Department.find().sort({ deptId: 1 });
    res.json(depts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
};

// Get one
export const getDepartment = async (req, res) => {
  try {
    const dept = await Department.findOne({ deptId: req.params.deptId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch department' });
  }
};

// Update deptName only
export const updateDepartment = async (req, res) => {
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const { deptName } = req.body;
    if (!deptName) return res.status(400).json({ message: 'deptName required' });
    const dept = await Department.findOneAndUpdate({ deptId: req.params.deptId }, { deptName }, { new: true });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department updated', department: dept });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update department' });
  }
};

// Delete
export const deleteDepartment = async (req, res) => {
  try {
    const role = req.headers['x-role'];
    if (role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'SUPER_ADMIN role required' });
    const dept = await Department.findOne({ deptId: req.params.deptId });
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.deleteOne();
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete department' });
  }
};
