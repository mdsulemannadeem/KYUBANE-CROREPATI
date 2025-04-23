const express = require('express');
const router = express.Router();
const User = require('../models/user'); // If models is in the parent directory
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "your_secret_key_here";

// Signup
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, email, password: hashed });
    res.json({ message: "User created" });
  } catch {
    res.status(400).json({ error: "Email already exists" });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid email" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET);
  res.json({ token });
});

module.exports = router;
