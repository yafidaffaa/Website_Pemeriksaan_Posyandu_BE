const { Pemeriksaan, Pasien } = require('../models');
const ExcelJS = require('exceljs');

// READ ALL
exports.getAllPemeriksaan = async (req, res) => {
  try {
    const pemeriksaan = await Pemeriksaan.findAll({ include: Pasien });
    res.json(pemeriksaan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// FILTER kategori + tanggal
exports.getByKategoriAndDate = async (req, res) => {
  try {
    const { kategori, tanggal } = req.query;
    const pemeriksaan = await Pemeriksaan.findAll({
      include: [{ model: Pasien, where: { kategori } }],
      where: { tanggal }
    });
    res.json(pemeriksaan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CARI pasien by nama untuk statistik
exports.findByPasienName = async (req, res) => {
  try {
    const { nama } = req.query;
    const pemeriksaan = await Pemeriksaan.findAll({
      include: [{ model: Pasien, where: { nama } }]
    });
    res.json(pemeriksaan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// EXPORT EXCEL format kelurahan
exports.exportKelurahan = async (req, res) => {
  try {
    const { kategori, tanggal } = req.query;
    const pemeriksaan = await Pemeriksaan.findAll({
      include: [{ model: Pasien, where: { kategori } }],
      where: { tanggal }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kelurahan');

    sheet.addRow(['Nama Pasien', 'Kategori', 'Tanggal', 'Hasil Pemeriksaan']);
    pemeriksaan.forEach(p => {
      sheet.addRow([
        p.Pasien.nama,
        p.Pasien.kategori,
        p.tanggal,
        JSON.stringify(p.hasil_input)
      ]);
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=laporan_kelurahan.xlsx'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// EXPORT EXCEL format puskesmas
exports.exportPuskesmas = async (req, res) => {
  try {
    const { kategori, tanggal } = req.query;
    const pemeriksaan = await Pemeriksaan.findAll({
      include: [{ model: Pasien, where: { kategori } }],
      where: { tanggal }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Puskesmas');

    sheet.addRow(['Nama Pasien', 'Tanggal', 'Detail Pemeriksaan']);
    pemeriksaan.forEach(p => {
      sheet.addRow([
        p.Pasien.nama,
        p.tanggal,
        JSON.stringify(p.hasil_perhitungan)
      ]);
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=laporan_puskesmas.xlsx'
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
