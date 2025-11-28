import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { batchAPI, departmentAPI, superAdminAPI, type Batch } from '../services/api';

export default function BatchManagement() {
	const [batches, setBatches] = useState<Batch[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
	const [batchId, setBatchId] = useState('');
	const [batchName, setBatchName] = useState('');
	const [batchYear, setBatchYear] = useState<number | ''>('');
	const [deptId, setDeptId] = useState('');
	const [adminId, setAdminId] = useState('');
	const [departments, setDepartments] = useState<{ deptId: string; deptName: string; _id?: string }[]>([]); // still loaded for validation but not shown
	const [admins, setAdmins] = useState<any[]>([]);
	const [studentsText, setStudentsText] = useState('');
	const [previewCount, setPreviewCount] = useState(0);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [missingDeptMessage, setMissingDeptMessage] = useState<string | null>(null);

	useEffect(() => {
		loadBatches();
		loadDepartments(); // used to validate inferred deptId exists
		loadAdmins();
	}, []);

	const loadDepartments = async () => {
		try {
			const list = await departmentAPI.listDepartments();
			setDepartments(list);
		} catch (e: any) {}
	};

	const loadAdmins = async () => {
		try {
			const list = await superAdminAPI.getAdmins();
			setAdmins(list);
		} catch (e: any) {}
	};

	const loadBatches = async () => {
		try {
			setIsLoading(true);
			const data = await batchAPI.getBatches();
			setBatches(data);
		} catch (e: any) {
			toast.error(e.message || 'Failed to load batches');
		} finally {
			setIsLoading(false);
		}
	};

	// Live preview of students & auto-detect deptId from first valid data line (skip header if present)
	useEffect(() => {
		if (!studentsText.trim()) {
			setPreviewCount(0);
			setPreviewError(null);
			setMissingDeptMessage(null);
			if (!editingBatch) setDeptId('');
			return;
		}
		try {
			const rawLines = studentsText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
			let lines = [...rawLines];
			// Detect and remove header line (e.g. name,regno,dept,email,mobile)
			if (lines.length) {
				const headerParts = lines[0].split(',').map(p => p.trim().toLowerCase());
				if (headerParts[0] === 'name' && headerParts[1] === 'regno' && headerParts[2] === 'dept') {
					lines = lines.slice(1); // drop header
				}
			}
			let count = 0;
			let firstDept: string | null = null;
			for (const line of lines) {
				const parts = line.split(',').map(p => p.trim());
				if (parts.length !== 5 || parts.some(p => !p)) {
					throw new Error(`Invalid line: ${line}`);
				}
				if (!firstDept) firstDept = parts[2].toUpperCase();
				count++;
			}
			if (!editingBatch && firstDept) {
				setDeptId(firstDept);
				if (departments.length && !departments.find(d => d.deptId === firstDept)) {
					// Inform instead of error; we'll auto-create on submit
					setMissingDeptMessage(`Department ${firstDept} will be auto-created.`);
				} else {
					setMissingDeptMessage(null);
				}
			}
			setPreviewCount(count);
			if (!previewError) setPreviewError(null);
		} catch (e: any) {
			setPreviewError(e.message);
			setMissingDeptMessage(null);
			setPreviewCount(0);
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [studentsText, editingBatch, departments]);

	const resetForm = () => {
		setBatchId('');
		setBatchName('');
		setBatchYear('');
		setDeptId('');
		setAdminId('');
		setStudentsText('');
		setEditingBatch(null);
		setShowForm(false);
		setPreviewCount(0);
		setPreviewError(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!batchName.trim() || !batchYear) {
			toast.error('Batch name and year required');
			return;
		}
		if (previewError) {
			toast.error('Fix student list errors');
			return;
		}
		// Auto-create department if flagged missing
		if (!editingBatch && deptId && missingDeptMessage) {
			try {
				await departmentAPI.createDepartment(deptId, deptId);
				toast.success(`Department ${deptId} created`);
			} catch (e:any) {
				// Ignore duplicate creation attempt
			}
		}
		try {
			setIsLoading(true);
			if (editingBatch) {
				await batchAPI.updateBatch(editingBatch._id!, { batchName, batchYear: Number(batchYear), deptId, adminId, studentsText });
				toast.success('Batch updated');
			} else {
				await batchAPI.createBatch({ batchId, batchName, batchYear: Number(batchYear), deptId, adminId: adminId || undefined, studentsText });
				toast.success('Batch created');
			}
			resetForm();
			loadBatches();
		} catch (e: any) {
			toast.error(e.message || 'Save failed');
		} finally {
			setIsLoading(false);
		}
	};

	const startEdit = (b: Batch) => {
		setEditingBatch(b);
		setBatchId(b.batchId || '');
		setBatchName(b.batchName);
		setBatchYear(b.batchYear);
		setDeptId(b.deptId || '');
		setAdminId(b.adminId || '');
		setStudentsText(b.students.map(s => `${s.name},${s.regno},${s.dept},${s.email},${s.mobile}`).join('\n'));
		setShowForm(true);
	};

	const deleteBatch = async (id: string) => {
		if (!window.confirm('Delete this batch?')) return;
		try {
			setIsLoading(true);
			await batchAPI.deleteBatch(id);
			toast.success('Batch deleted');
			loadBatches();
		} catch (e: any) {
			toast.error(e.message || 'Delete failed');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="bg-white rounded-xl shadow-xl p-6">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-2xl font-bold text-purple-950">Batch Management</h2>
				<div className="flex gap-3">
					<button
						onClick={() => {
							if (showForm) {
								resetForm();
							} else {
								setShowForm(true);
							}
						}}
						className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
					>
						{showForm ? (editingBatch ? 'Cancel Edit' : 'Cancel') : 'Create New Batch'}
					</button>
				</div>
			</div>

			{(showForm || editingBatch) && (
				<div className="bg-purple-50 p-6 rounded-lg mb-6">
					<h3 className="text-xl font-semibold text-purple-950 mb-4">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label className="block text-purple-900 mb-1 font-medium">Batch ID (unique)</label>
								<input
									type="text"
									value={batchId}
									onChange={(e) => setBatchId(e.target.value.toUpperCase())}
									className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
									required={!editingBatch}
									disabled={!!editingBatch}
								/>
							</div>
							<div>
								<label className="block text-purple-900 mb-1 font-medium">Batch Name</label>
								<input
									type="text"
									value={batchName}
									onChange={(e) => setBatchName(e.target.value)}
									className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
									required
								/>
							</div>
							<div>
								<label className="block text-purple-900 mb-1 font-medium">Batch Year</label>
								<input
									type="number"
									value={batchYear}
									onChange={(e) => setBatchYear(e.target.value ? Number(e.target.value) : '')}
									className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
									required
								/>
							</div>
							<div>
								<label className="block text-purple-900 mb-1 font-medium">Department (auto)</label>
								<input
									type="text"
									value={deptId}
									readOnly
									placeholder="Detected from students CSV"
									className="w-full px-4 py-2 border border-dashed border-purple-300 bg-white rounded-lg focus:outline-none text-purple-700"
								/>
							</div>
							<div>
								<label className="block text-purple-900 mb-1 font-medium">Assign Admin (optional)</label>
								<select
									value={adminId}
									onChange={(e) => setAdminId(e.target.value)}
									className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
								>
									<option value="">None</option>
									{admins.map(a => <option key={a._id} value={a.adminId}>{a.adminId} - {a.username}</option>)}
								</select>
							</div>
						</div>
						<div>
							<label className="block text-purple-900 mb-1 font-medium">Students (CSV lines)</label>
							<textarea
								placeholder="name,regno,dept,email,mobile\nJane Doe,REG123,CSE,jane@example.com,9876543210"
								value={studentsText}
								onChange={(e) => setStudentsText(e.target.value)}
								rows={8}
								className="w-full px-4 py-2 border border-purple-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
							/>
							<div className="mt-2 text-sm">
								{previewError && <span className="text-red-600">{previewError}</span>}
								{!previewError && <span className="text-purple-700">Parsed students: {previewCount}</span>}
								{missingDeptMessage && !previewError && (
									<div className="text-amber-600 mt-1">{missingDeptMessage}</div>
								)}
							</div>
						</div>
						<div className="flex gap-4">
							<button
								type="submit"
								disabled={isLoading}
								className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
							>
								{isLoading ? 'Saving...' : (editingBatch ? 'Update Batch' : 'Create Batch')}
							</button>
							{editingBatch && (
								<button
									type="button"
									onClick={resetForm}
									className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
								>
									Cancel
								</button>
							)}
						</div>
					</form>
				</div>
			)}

			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="bg-white rounded-xl border border-purple-200 shadow animate-pulse p-5">
							<div className="h-6 w-32 bg-purple-100 rounded mb-3" />
							<div className="h-4 w-24 bg-purple-100 rounded mb-5" />
							<div className="flex gap-3">
								<div className="h-9 w-20 bg-purple-100 rounded" />
								<div className="h-9 w-20 bg-purple-100 rounded" />
							</div>
						</div>
					))}
				</div>
			) : batches.length === 0 ? (
				<div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-purple-800 text-center">
					No batches found. Create one.
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{batches.map(batch => (
						<div key={batch._id} className="bg-white rounded-xl border border-purple-200 shadow hover:shadow-lg transition p-5 flex flex-col">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-purple-950 font-semibold leading-tight">{batch.batchName}</p>
									<p className="text-sm text-purple-700">Year: {batch.batchYear}</p>
									<p className="text-xs text-purple-600">Batch ID: {batch.batchId}</p>
									{batch.deptId && <p className="text-xs text-purple-600">Dept: {batch.deptId}</p>}
									{batch.adminId ? (
										<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">Admin: {batch.adminId}</span>
									) : (
										<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">No Admin</span>
									)}
									<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
										{batch.students.length} students
									</span>
								</div>
							</div>
							{batch.students.length > 0 && (
								<details className="mb-3">
									<summary className="cursor-pointer text-sm text-purple-600">View students</summary>
									<ul className="mt-2 text-xs max-h-40 overflow-auto divide-y">
										{batch.students.map((s, idx) => (
											<li key={idx} className="py-1">
												<span className="font-medium">{s.name}</span> - {s.regno} - {s.dept}
											</li>
										))}
									</ul>
								</details>
							)}
							<div className="mt-auto flex gap-2 pt-2">
								<button
									onClick={() => startEdit(batch)}
									className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
								>Edit</button>
								<button
									onClick={() => deleteBatch(batch._id!)}
									className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
								>Delete</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
