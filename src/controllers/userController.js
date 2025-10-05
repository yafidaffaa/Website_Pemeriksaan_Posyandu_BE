const { User } = require('../models');
const bcrypt = require('bcryptjs');

// CREATE
exports.createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash, role });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ALL
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ['id','username','role'] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ONE
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: ['id','username','role'] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (password) user.password = await bcrypt.hash(password, 10);
    if (username) user.username = username;
    if (role) user.role = role;
    await user.save();

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
exports.deleteUser = async (req, res) => {
  try {
    const result = await User.destroy({ where: { id: req.params.id } });
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
