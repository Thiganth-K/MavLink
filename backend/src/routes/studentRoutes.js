import express from "express";
import multer from "multer";
import { verifyAdminOrSuperAdmin } from '../middleware/authMiddleware.js';
import {
  uploadCSV,
  createStudent,
  getStudents,
  getAssignedStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  deleteAllStudents
} from "../controllers/studentController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload CSV (only Admin or SuperAdmin)
router.post("/upload", verifyAdminOrSuperAdmin, upload.single("csv"), uploadCSV);

// CRUD
// Create student (only Admin or SuperAdmin)
router.post("/", verifyAdminOrSuperAdmin, createStudent);
router.get("/", getStudents);
// Get students assigned to an admin (uses x-admin-id header or ?adminId=)
router.get("/assigned", getAssignedStudents);
router.get("/:id", getStudentById);
router.put('/:id', verifyAdminOrSuperAdmin, updateStudent);


router.delete("/delete-all", verifyAdminOrSuperAdmin, deleteAllStudents);
router.delete("/:id", verifyAdminOrSuperAdmin, deleteStudent);
export default router;
