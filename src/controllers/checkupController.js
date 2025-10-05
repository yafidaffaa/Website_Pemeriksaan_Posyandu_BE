const { Checkup } = require('../models');

// READ (hari ini)
exports.getCheckupsToday = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const checkups = await Checkup.findAll({ where: { tanggal: today } });
    res.json(checkups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updateCheckup = async (req, res) => {
  try {
    const checkup = await Checkup.findByPk(req.params.id);
    if (!checkup) return res.status(404).json({ message: 'Checkup not found' });
    await checkup.update(req.body);
    res.json(checkup);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
