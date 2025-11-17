import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
  regno: { type: String, required: true, unique: true },
  studentname: { type: String, required: true },
  dept: { type: String, required: true },
  email: { type: String, required: true },
  phno: { type: String, required: true }
});

export default mongoose.model("Student", studentSchema);
