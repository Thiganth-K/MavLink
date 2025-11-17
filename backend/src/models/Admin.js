import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["SUPER_ADMIN", "ADMIN"],
    default: "ADMIN"
  }
});

export default mongoose.model("Admin", adminSchema);
