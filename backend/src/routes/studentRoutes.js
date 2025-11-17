import express from "express";
import multer from "multer";
import {
  uploadCSV,
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  deleteAllStudents
} from "../controllers/studentController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload CSV
router.post("/upload", upload.single("csv"), uploadCSV);

// CRUD
router.post("/", createStudent);
router.get("/", getStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);



router.delete("/delete-all",  deleteAllStudents);
router.delete("/:id", deleteStudent);
export default router;
