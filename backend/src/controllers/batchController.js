import Batch from '../models/Batch.js';
import Admin from '../models/Admin.js';

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
	try {
		await ensureSuperAdmin(req);
		const { batchName, batchYear, studentsText } = req.body;
		if (!batchName || !batchYear) {
			return res.status(400).json({ message: 'batchName and batchYear are required' });
		}
		const existing = await Batch.findOne({ batchName });
		if (existing) {
			return res.status(409).json({ message: 'Batch name already exists' });
		}
		let students = [];
		try {
			students = parseStudents(studentsText || '');
		} catch (e) {
			return res.status(400).json({ message: e.message });
		}
		const batch = await Batch.create({ batchName, batchYear, students });
		res.status(201).json({ message: 'Batch created', batch });
	} catch (err) {
		res.status(403).json({ message: err.message || 'Failed to create batch' });
	}
};

export const getBatches = async (req, res) => {
	try {
		const batches = await Batch.find().sort({ createdAt: -1 });
		res.json(batches);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch batches' });
	}
};

export const getBatch = async (req, res) => {
	try {
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		res.json(batch);
	} catch (err) {
		res.status(500).json({ message: 'Failed to fetch batch' });
	}
};

export const updateBatch = async (req, res) => {
	try {
		await ensureSuperAdmin(req);
		const { batchName, batchYear, studentsText } = req.body;
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		if (batchName) batch.batchName = batchName;
		if (batchYear) batch.batchYear = batchYear;
		if (typeof studentsText === 'string') {
			try {
				batch.students = parseStudents(studentsText);
			} catch (e) {
				return res.status(400).json({ message: e.message });
			}
		}
		await batch.save();
		res.json({ message: 'Batch updated', batch });
	} catch (err) {
		res.status(403).json({ message: err.message || 'Failed to update batch' });
	}
};

export const deleteBatch = async (req, res) => {
	try {
		await ensureSuperAdmin(req);
		const batch = await Batch.findById(req.params.id);
		if (!batch) return res.status(404).json({ message: 'Batch not found' });
		await batch.deleteOne();
		res.json({ message: 'Batch deleted' });
	} catch (err) {
		res.status(403).json({ message: err.message || 'Failed to delete batch' });
	}
};
