const { Pasien, Checkup } = require('../models');

// CREATE (plus auto masuk ke antrian/checkup hari ini)
exports.createPasien = async (req, res) => {
  try {
    const pasien = await Pasien.create(req.body);

    // otomatis tambahkan ke checkup hari ini (meja1)
    const today = new Date().toISOString().slice(0, 10);
    await Checkup.create({
      pasien_id: pasien.id,
      tanggal: today,
      meja: 'meja1',
      data_input: {}
    });

    res.status(201).json(pasien);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ALL
exports.getAllPasien = async (req, res) => {
  try {
    const pasien = await Pasien.findAll();
    res.json(pasien);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ ONE
exports.getPasienById = async (req, res) => {
  try {
    const pasien = await Pasien.findByPk(req.params.id);
    if (!pasien) return res.status(404).json({ message: 'Pasien not found' });
    res.json(pasien);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE
exports.updatePasien = async (req, res) => {
  try {
    const pasien = await Pasien.findByPk(req.params.id);
    if (!pasien) return res.status(404).json({ message: 'Pasien not found' });
    await pasien.update(req.body);
    res.json(pasien);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE
exports.deletePasien = async (req, res) => {
  try {
    const result = await Pasien.destroy({ where: { id: req.params.id } });
    if (!result) return res.status(404).json({ message: 'Pasien not found' });
    res.json({ message: 'Pasien deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
