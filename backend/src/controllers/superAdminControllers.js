import Admin from "../models/Admin.js";

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
    user: { username: adminUser.username }
  });
};

// ---------- CREATE ADMIN ----------
export const createAdmin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const newAdmin = await Admin.create({
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
  const { username, password } = req.body;

  try {
    const updated = await Admin.findByIdAndUpdate(
      id,
      { username, password },
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