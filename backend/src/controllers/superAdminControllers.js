import Admin from "../models/Admin.js";
import Batch from "../models/Batch.js";
import Department from "../models/Department.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import ExcelJS from "exceljs";

// ---------- LOGIN ----------
export const loginController = async (req, res) => {
  const { username, password } = req.body;

  const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  // SUPER ADMIN LOGIN (from .env)
  if (username === SUPER_ADMIN_USERNAME && password === SUPER_ADMIN_PASSWORD) {
    return res.status(200).json({
      message: "Super Admin login successful",
      role: "SUPER_ADMIN",
      user: { username }
    });
  }

  // ADMIN LOGIN (from DB)
  const adminUser = await Admin.findOne({ username });

  if (!adminUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (password !== adminUser.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  return res.status(200).json({
    message: "Admin login successful",
    role: adminUser.role,
    user: { username: adminUser.username, adminId: adminUser.adminId, assignedBatchIds: adminUser.assignedBatchIds }
  });
};

// ---------- CREATE ADMIN ----------
export const createAdmin = async (req, res) => {
  const { adminId, username, password } = req.body;

  try {
    const newAdmin = await Admin.create({
      adminId,
      username,
      password,
      role: "ADMIN"
    });

    return res.status(201).json({
      message: "Admin created successfully",
      admin: newAdmin
    });
  } catch (err) {
    return res.status(500).json({ message: "Error creating admin", error: err });
  }
};

// ---------- READ ALL ADMINS ----------
export const getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    return res.status(200).json(admins);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching admins" });
  }
};

// ---------- UPDATE ADMIN ----------
export const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const { username, password, adminId } = req.body;

  try {
    const updateFields = {};
    if (username) updateFields.username = username;
    if (password) updateFields.password = password;
    if (adminId) updateFields.adminId = adminId;
    const updated = await Admin.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Admin not found" });

    return res.status(200).json({
      message: "Admin updated successfully",
      admin: updated
    });
  } catch (err) {
    return res.status(500).json({ message: "Error updating admin" });
  }
};

// ---------- DELETE ADMIN ----------
export const deleteAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Admin.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ message: "Admin not found" });

    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Error deleting admin" });
  }
};

export const logoutSuperAdmin = (req, res) => {
  return res.status(200).json({
    message: "Super Admin logged out successfully"
  });
};

// ---------- EXPORT DATA (EXCEL) ----------
// Generates a workbook with multiple sheets: Admins, Batches, Departments, Students, Attendance
// Only SUPER_ADMIN role should invoke (simple header check for now)
export const exportPlatformData = async (req, res) => {
  try {
    const role = req.headers['x-role'] || req.headers['X-Role'];
    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'SUPER_ADMIN role required for export' });
    }

    // Fetch data sets
    const [admins, batches, departments, students, attendance] = await Promise.all([
      Admin.find().lean(),
      Batch.find().lean(),
      Department.find().lean(),
      Student.find().lean(),
      Attendance.find().lean()
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'MavLink';
    wb.created = new Date();

    // Admins sheet
    const adminSheet = wb.addWorksheet('Admins');
    adminSheet.columns = [
      { header: 'adminId', key: 'adminId', width: 16 },
      { header: 'username', key: 'username', width: 20 },
      { header: 'role', key: 'role', width: 14 },
      { header: 'assignedBatchIds', key: 'assignedBatchIds', width: 40 },
      { header: 'createdAt', key: 'createdAt', width: 24 },
      { header: 'updatedAt', key: 'updatedAt', width: 24 }
    ];
    admins.forEach(a => adminSheet.addRow({
      ...a,
      assignedBatchIds: (a.assignedBatchIds || []).join(','),
      createdAt: a.createdAt?.toISOString?.() || '',
      updatedAt: a.updatedAt?.toISOString?.() || ''
    }));

    // Batches sheet
    const batchSheet = wb.addWorksheet('Batches');
    batchSheet.columns = [
      { header: 'batchId', key: 'batchId', width: 16 },
      { header: 'batchName', key: 'batchName', width: 20 },
      { header: 'batchYear', key: 'batchYear', width: 10 },
      { header: 'deptId', key: 'deptId', width: 12 },
      { header: 'adminId', key: 'adminId', width: 16 },
      { header: 'studentCount', key: 'studentCount', width: 14 },
      { header: 'createdAt', key: 'createdAt', width: 24 }
    ];
    batches.forEach(b => batchSheet.addRow({
      batchId: b.batchId,
      batchName: b.batchName,
      batchYear: b.batchYear,
      deptId: b.deptId,
      adminId: b.adminId || '',
      studentCount: (b.students || []).length,
      createdAt: b.createdAt?.toISOString?.() || ''
    }));

    // Departments sheet
    const deptSheet = wb.addWorksheet('Departments');
    deptSheet.columns = [
      { header: 'deptId', key: 'deptId', width: 12 },
      { header: 'deptName', key: 'deptName', width: 24 },
      { header: 'createdAt', key: 'createdAt', width: 24 }
    ];
    departments.forEach(d => deptSheet.addRow({
      deptId: d.deptId,
      deptName: d.deptName,
      createdAt: d.createdAt?.toISOString?.() || ''
    }));

    // Students sheet
    const studentSheet = wb.addWorksheet('Students');
    studentSheet.columns = [
      { header: 'regno', key: 'regno', width: 16 },
      { header: 'studentname', key: 'studentname', width: 20 },
      { header: 'dept', key: 'dept', width: 12 },
      { header: 'batchId', key: 'batchId', width: 16 },
      { header: 'email', key: 'email', width: 28 },
      { header: 'phno', key: 'phno', width: 16 },
      { header: 'createdAt', key: 'createdAt', width: 24 }
    ];
    students.forEach(s => studentSheet.addRow({
      regno: s.regno,
      studentname: s.studentname,
      dept: s.dept,
      batchId: s.batchId || '',
      email: s.email,
      phno: s.phno,
      createdAt: s.createdAt?.toISOString?.() || ''
    }));

    // Attendance sheet (flatten entries)
    const attendanceSheet = wb.addWorksheet('Attendance');
    attendanceSheet.columns = [
      { header: 'batchId', key: 'batchId', width: 12 },
      { header: 'date', key: 'date', width: 14 },
      { header: 'session', key: 'session', width: 8 },
      { header: 'markedBy', key: 'markedBy', width: 18 },
      { header: 'regno', key: 'regno', width: 14 },
      { header: 'studentname', key: 'studentname', width: 20 },
      { header: 'status', key: 'status', width: 12 },
      { header: 'reason', key: 'reason', width: 30 }
    ];
    attendance.forEach(a => {
      const dateStr = a.date ? new Date(a.date).toISOString().slice(0,10) : '';
      (a.entries || []).forEach(entry => {
        attendanceSheet.addRow({
          batchId: a.batchId,
          date: dateStr,
          session: a.session,
          markedBy: a.markedBy,
          regno: entry.regno,
          studentname: entry.studentname,
          status: entry.status,
          reason: entry.reason || ''
        });
      });
    });

    // Style headers
    [adminSheet, batchSheet, deptSheet, studentSheet, attendanceSheet].forEach(sh => {
      sh.getRow(1).font = { bold: true };
      sh.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="mavlink_export.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export error', err);
    res.status(500).json({ message: 'Failed to export data', error: err.message });
  }
};