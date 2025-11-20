import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { batchAPI, type Batch } from '../services/api';

interface Props {
	onClose: () => void;
}

export default function BatchManagement({ onClose }: Props) {
	const [batches, setBatches] = useState<Batch[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
	const [batchName, setBatchName] = useState('');
	const [batchYear, setBatchYear] = useState<number | ''>('');
	const [studentsText, setStudentsText] = useState('');
	const [previewCount, setPreviewCount] = useState(0);
	const [previewError, setPreviewError] = useState<string | null>(null);

	useEffect(() => {
		loadBatches();
	}, []);

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

	// Live preview of students
	useEffect(() => {
		if (!studentsText.trim()) {
			setPreviewCount(0);
			setPreviewError(null);
			return;
		}
		try {
			const lines = studentsText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
			let count = 0;
			for (const line of lines) {
				const parts = line.split(',').map(p => p.trim());
				if (parts.length !== 5 || parts.some(p => !p)) {
					throw new Error(`Invalid line: ${line}`);
				}
				count++;
			}
			setPreviewCount(count);
			setPreviewError(null);
		} catch (e: any) {
			setPreviewError(e.message);
			setPreviewCount(0);
		}
	}, [studentsText]);

	const resetForm = () => {
		setBatchName('');
		setBatchYear('');
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
		try {
			setIsLoading(true);
			if (editingBatch) {
				await batchAPI.updateBatch(editingBatch._id!, { batchName, batchYear: Number(batchYear), studentsText });
				toast.success('Batch updated');
			} else {
				await batchAPI.createBatch({ batchName, batchYear: Number(batchYear), studentsText });
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
		setBatchName(b.batchName);
		setBatchYear(b.batchYear);
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
				<h2 className="text-2xl font-bold text-blue-950">Batch Management</h2>
				<div className="flex gap-3">
					<button onClick={onClose} className="px-4 py-2 bg-gray-200 text-blue-900 rounded-lg hover:bg-gray-300 transition-colors">Close</button>
					<button
						onClick={() => {
							if (showForm) {
								resetForm();
							} else {
								setShowForm(true);
							}
						}}
						className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
					>
						{showForm ? (editingBatch ? 'Cancel Edit' : 'Cancel') : 'Create New Batch'}
					</button>
				</div>
			</div>

			{(showForm || editingBatch) && (
				<div className="bg-blue-50 p-6 rounded-lg mb-6">
					<h3 className="text-xl font-semibold text-blue-950 mb-4">{editingBatch ? 'Edit Batch' : 'Create New Batch'}</h3>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<label className="block text-blue-900 mb-1 font-medium">Batch Name</label>
								<input
									type="text"
									value={batchName}
									onChange={(e) => setBatchName(e.target.value)}
									className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
									required
								/>
							</div>
							<div>
								<label className="block text-blue-900 mb-1 font-medium">Batch Year</label>
								<input
									type="number"
									value={batchYear}
									onChange={(e) => setBatchYear(e.target.value ? Number(e.target.value) : '')}
									className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
									required
								/>
							</div>
						</div>
						<div>
							<label className="block text-blue-900 mb-1 font-medium">Students (CSV lines)</label>
							<textarea
								placeholder="name,regno,dept,email,mobile\nJane Doe,REG123,CSE,jane@example.com,9876543210"
								value={studentsText}
								onChange={(e) => setStudentsText(e.target.value)}
								rows={8}
								className="w-full px-4 py-2 border border-blue-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
							<div className="mt-2 text-sm">
								{previewError ? (
									<span className="text-red-600">{previewError}</span>
								) : (
									<span className="text-blue-700">Parsed students: {previewCount}</span>
								)}
							</div>
						</div>
						<div className="flex gap-4">
							<button
								type="submit"
								disabled={isLoading}
								className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
						<div key={i} className="bg-white rounded-xl border border-blue-200 shadow animate-pulse p-5">
							<div className="h-6 w-32 bg-blue-100 rounded mb-3" />
							<div className="h-4 w-24 bg-blue-100 rounded mb-5" />
							<div className="flex gap-3">
								<div className="h-9 w-20 bg-blue-100 rounded" />
								<div className="h-9 w-20 bg-blue-100 rounded" />
							</div>
						</div>
					))}
				</div>
			) : batches.length === 0 ? (
				<div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-blue-800 text-center">
					No batches found. Create one.
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{batches.map(batch => (
						<div key={batch._id} className="bg-white rounded-xl border border-blue-200 shadow hover:shadow-lg transition p-5 flex flex-col">
							<div className="flex items-start justify-between mb-4">
								<div>
									<p className="text-blue-950 font-semibold leading-tight">{batch.batchName}</p>
									<p className="text-sm text-blue-700">Year: {batch.batchYear}</p>
									<span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
										{batch.students.length} students
									</span>
								</div>
							</div>
							{batch.students.length > 0 && (
								<details className="mb-3">
									<summary className="cursor-pointer text-sm text-blue-600">View students</summary>
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
