export const loginSuperAdmin = (req, res) => {
  const { username, password } = req.body;

  const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  if (!username || !password) {
    return res.status(400).json({ message: "Username & password required" });
  }

  // Validate
  if (
    username === SUPER_ADMIN_USERNAME &&
    password === SUPER_ADMIN_PASSWORD
  ) {
    return res.status(200).json({
      message: "Super Admin login successful",
      user: { username },
      role: "SUPER_ADMIN"
    });
  }

  return res.status(401).json({ message: "Invalid Super Admin credentials" });
};

export const logoutSuperAdmin = (req, res) => {
  return res.status(200).json({
    message: "Super Admin logged out successfully"
  });
};