import express from 'express';
import { createDepartment, listDepartments, getDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController.js';

const router = express.Router();

router.post('/', createDepartment);
router.get('/', listDepartments);
router.get('/:deptId', getDepartment);
router.put('/:deptId', updateDepartment);
router.delete('/:deptId', deleteDepartment);

export default router;
