import Batch from '../models/Batch.js';
import Admin from '../models/Admin.js';
import Department from '../models/Department.js';
import Student from '../models/Student.js';
import logger from '../utils/logger.js';

// Helper: parse textarea CSV (each line: name,regno,dept,email,mobile)
function parseStudents(csvText) {
	if (!csvText) return [];
	const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
	const students = [];
	for (const line of lines) {
		const parts = line.split(',').map(p => p.trim());
		if (parts.length !== 5) {
			throw new Error(`Invalid student line format: "${line}"`);
		}
		const [name, regno, dept, email, mobile] = parts;
		if (!name || !regno || !dept || !email || !mobile) {
			throw new Error(`Missing field in line: "${line}"`);
		}
		students.push({ name, regno, dept, email, mobile });
	}
	return students;
}

// Middleware-like check (simple role verify using request body optional or later auth token)
async function ensureSuperAdmin(req) {
	// Expect header X-Role or safe fallback (this is simplistic; integrate real auth later)
	const role = req.headers['x-role'];
	if (role !== 'SUPER_ADMIN') {
		throw new Error('SUPER_ADMIN role required');
	}
}

export const createBatch = async (req, res) => {
	const start = Date.now();
	logger.debug('createBatch start', { bodyKeys: Object.keys(req.body || {}) });
	try {
		await ensureSuperAdmin(req);
		const { batchId, batchName, batchYear, deptId, adminId, studentsText } = req.body;
		if (!batchId || !batchName || !batchYear || !deptId) {
			return res.status(400).json({ message: 'batchId, batchName, batchYear and deptId are required' });
		}
		const existing = await Batch.findOne({ batchId });
		if (existing) {
			return res.status(409).json({ message: 'Batch ID already exists' });
		}
		let dept = await Department.findOne({ deptId });
		if (!dept) {
			// Auto-create department with deptName same as deptId for convenience
			dept = await Department.create({ deptId, deptName: deptId });
		}
		let mappedAdmin = null;
		if (adminId) {
			mappedAdmin = await Admin.findOne({ adminId });
			if (!mappedAdmin) {
				return res.status(404).json({ message: 'Admin not found for adminId' });
			}
		}
		let students = [];
		try {
			students = parseStudents(studentsText || '');
		} catch (e) {
			return res.status(400).json({ message: e.message });
		}
		const createdBy = req.headers['x-user'] || 'SUPER_ADMIN';
		const batch = await Batch.create({ batchId, batchName, batchYear, deptId, adminId: adminId || null, createdBy, students });

		// Upsert Student docs with batchId linkage
		for (const s of students) {
			const existingStudent = await Student.findOne({ regno: s.regno });
			if (existingStudent) {
				existingStudent.batchId = batchId;
				// keep other fields updated optionally
				existingStudent.studentname = s.name;
				existingStudent.dept = s.dept;
				existingStudent.email = s.email;
				existingStudent.phno = s.mobile;
				await existingStudent.save();
			} else {
				await Student.create({
					regno: s.regno,
					studentname: s.name,
					dept: s.dept,
					batchId: batchId,
					email: s.email,
					phno: s.mobile
				});
			}
		}

		// Add batch to admin assignment list
		if (mappedAdmin) {
			if (!mappedAdmin.assignedBatchIds.includes(batchId)) {
				mappedAdmin.assignedBatchIds.push(batchId);
				await mappedAdmin.save();
			}
		}
		logger.info('createBatch success', { durationMs: Date.now() - start, batchId });
		res.status(201).json({ message: 'Batch created', batch });
	} catch (err) {
		logger.error('createBatch error', { error: err.message });
		res.status(403).json({ message: err.message || 'Failed to create batch' });
	}
};

export const getBatches = async (req, res) => {
  const start = Date.now();
  logger.debug('getBatches start');
	try {
		const batches = await Batch.find().sort({ createdAt: -1 });
		logger.info('getBatches success', { durationMs: Date.now() - start, count: batches.length });
		res.json(batches);
	} catch (err) {
		logger.error('getBatches error', { error: err.message });
		res.status(500).json({ message: 'Failed to fetch batches' });
	}
};

export const getBatch = async (req, res) => {
  const start = Date.now();
  logger.debug('getBatch start', { id: req.params.id });
	try {
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		logger.info('getBatch success', { durationMs: Date.now() - start, id: req.params.id });
		res.json(batch);
	} catch (err) {
		logger.error('getBatch error', { error: err.message });
		res.status(500).json({ message: 'Failed to fetch batch' });
	}
};

export const updateBatch = async (req, res) => {
	const start = Date.now();
	logger.debug('updateBatch start', { id: req.params.id, bodyKeys: Object.keys(req.body || {}) });
	try {
		await ensureSuperAdmin(req);
		const { batchName, batchYear, deptId, adminId, studentsText } = req.body;
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		if (batchName) batch.batchName = batchName;
		if (batchYear) batch.batchYear = batchYear;
		if (deptId) {
			const dept = await Department.findOne({ deptId });
			if (!dept) return res.status(404).json({ message: 'Department not found' });
			batch.deptId = deptId;
		}
		if (adminId) {
			const newAdmin = await Admin.findOne({ adminId });
			if (!newAdmin) return res.status(404).json({ message: 'Admin not found for adminId' });
			batch.adminId = adminId;
			if (!newAdmin.assignedBatchIds.includes(batch.batchId)) {
				newAdmin.assignedBatchIds.push(batch.batchId);
				await newAdmin.save();
			}
		}
		if (typeof studentsText === 'string') {
			try {
				const newStudents = parseStudents(studentsText);
				batch.students = newStudents;
				// sync student docs
				for (const s of newStudents) {
					const existingStudent = await Student.findOne({ regno: s.regno });
					if (existingStudent) {
						existingStudent.batchId = batch.batchId;
						existingStudent.studentname = s.name;
						existingStudent.dept = s.dept;
						existingStudent.email = s.email;
						existingStudent.phno = s.mobile;
						await existingStudent.save();
					} else {
						await Student.create({
							regno: s.regno,
							studentname: s.name,
							dept: s.dept,
							batchId: batch.batchId,
							email: s.email,
							phno: s.mobile
						});
					}
				}
			} catch (e) {
				return res.status(400).json({ message: e.message });
			}
		}
		await batch.save();
		logger.info('updateBatch success', { durationMs: Date.now() - start, batchId: batch.batchId });
		res.json({ message: 'Batch updated', batch });
	} catch (err) {
		logger.error('updateBatch error', { error: err.message });
		res.status(403).json({ message: err.message || 'Failed to update batch' });
	}
};

export const assignAdminToBatch = async (req, res) => {
	const start = Date.now();
	logger.debug('assignAdminToBatch start', { body: req.body });
	try {
		await ensureSuperAdmin(req);
		const { batchId, adminId } = req.body;
		if (!batchId || !adminId) {
			return res.status(400).json({ message: 'batchId and adminId required' });
		}
		const batch = await Batch.findOne({ batchId });
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		const admin = await Admin.findOne({ adminId });
		if (!admin) return res.status(404).json({ message: 'Admin not found' });
		batch.adminId = adminId;
		await batch.save();
		if (!admin.assignedBatchIds.includes(batchId)) {
			admin.assignedBatchIds.push(batchId);
			await admin.save();
		}
		logger.info('assignAdminToBatch success', { durationMs: Date.now() - start, batchId: batchId, adminId });
		res.json({ message: 'Admin assigned to batch', batch });
	} catch (err) {
		logger.error('assignAdminToBatch error', { error: err.message });
		res.status(403).json({ message: err.message || 'Failed to assign admin' });
	}
};

export const deleteBatch = async (req, res) => {
  const start = Date.now();
  logger.debug('deleteBatch start', { id: req.params.id });
	try {
		await ensureSuperAdmin(req);
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		await batch.deleteOne();
		logger.info('deleteBatch success', { durationMs: Date.now() - start, id: req.params.id });
		res.json({ message: 'Batch deleted' });
	} catch (err) {
		logger.error('deleteBatch error', { error: err.message });
		res.status(403).json({ message: err.message || 'Failed to delete batch' });
	}
};
