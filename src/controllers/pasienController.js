const { Pasien, CheckupSession } = require('../models');
const { Op } = require('sequelize');

// Fungsi bantu menghitung umur minggu/tahun
const hitungUmurMinggu = (birthDate) => {
  const today = new Date();
  const bdate = new Date(birthDate);
  const diffMs = today - bdate;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
};

const hitungUmurTahun = (birthDate) => {
  const today = new Date();
  const bdate = new Date(birthDate);
  let age = today.getFullYear() - bdate.getFullYear();
  const m = today.getMonth() - bdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bdate.getDate())) age--;
  return age;
};

// ==========================================
// CREATE PASIEN
// ==========================================
const createPasien = async (req, res, next) => {
  try {
    const { patientType } = req.body;
    if (!patientType) return res.status(400).json({ success: false, message: 'patientType wajib diisi' });

    const allowedFields = {
      balita: ['patientType', 'name', 'birthDate', 'gender', 'motherName', 'rt', 'kb', 'pus', 'wus', 'imunisasi'],
      ibu_hamil: [
        'patientType', 'name', 'birthDate', 'rt', 'nik', 'noKK', 'namaSuami',
        'gravida', 'partus', 'abortus', 'jarakPersalinanSebelumnya',
        'usiaKandunganMinggu', 'tglPemeriksaanPertama', 'hpm', 'hpl',
        'nomorJaminan', 'noTelp', 'golonganDarah'
      ]
    };

    const data = {};
    for (const key of allowedFields[patientType]) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }

    // Otomatis gender untuk ibu hamil
    if (patientType === 'ibu_hamil') data.gender = 'P';

    // Hitung umur
    if (req.body.birthDate) {
      if (patientType === 'balita') data.ageInWeeks = hitungUmurMinggu(req.body.birthDate);
      if (patientType === 'ibu_hamil') data.ageInYears = hitungUmurTahun(req.body.birthDate);
    }

    const pasien = await Pasien.create(data);

    const today = new Date().toISOString().slice(0, 10);
    const existing = await CheckupSession.findOne({
      where: { patient_id: pasien.id, session_date: today }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Pasien sudah ada di antrian hari ini'
      });
    }

    // Buat checkup session
    const checkupSession = await CheckupSession.create({
      patientId: pasien.id,
      sessionDate: today,
      completed: false,
      createdById: req.user.id
    });

    // TAMBAHAN: Buat measurement kosong untuk session ini
    const { Measurement } = require('../models');
    await Measurement.create({
      checkupSessionId: checkupSession.id,
      createdById: req.user.id,
      updatedById: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Pasien berhasil dibuat dan ditambahkan ke antrian hari ini',
      data: { pasien, checkupSession }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// UPDATE PASIEN
// ==========================================
const updatePasien = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pasien = await Pasien.findByPk(id);
    if (!pasien) return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan' });

    const { patientType } = pasien;

    const allowedFields = {
      balita: ['name', 'birthDate', 'gender', 'motherName', 'rt', 'kb', 'pus', 'wus', 'imunisasi'],
      ibu_hamil: [
        'name', 'birthDate', 'rt', 'nik', 'noKK', 'namaSuami', 'gravida',
        'partus', 'abortus', 'jarakPersalinanSebelumnya', 'usiaKandunganMinggu',
        'tglPemeriksaanPertama', 'hpm', 'hpl', 'nomorJaminan', 'noTelp', 'golonganDarah'
      ]
    };

    const updates = {};
    for (const key of allowedFields[patientType]) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Perbarui umur jika birthDate berubah
    if (req.body.birthDate) {
      if (patientType === 'balita') updates.ageInWeeks = hitungUmurMinggu(req.body.birthDate);
      if (patientType === 'ibu_hamil') updates.ageInYears = hitungUmurTahun(req.body.birthDate);
    }

    // Gender otomatis 'P' untuk ibu hamil
    if (patientType === 'ibu_hamil') updates.gender = 'P';

    await pasien.update(updates);

    res.status(200).json({
      success: true,
      message: 'Data pasien berhasil diperbarui',
      data: pasien
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET ALL PASIEN
// ==========================================
const getAllPasien = async (req, res, next) => {
  try {
    const { patientType, name, page = 1, limit = 10 } = req.query;
    const where = {};

    if (patientType) where.patientType = patientType;
    if (name) where.name = { [Op.like]: `%${name}%` };

    const offset = (page - 1) * limit;
    const { count, rows } = await Pasien.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']]
    });

    const data = rows.map((p, i) => {
      const fullData = p.toJSON();
      const base = {
        no: offset + i + 1,
        ...fullData,
      };

      if (p.patientType === 'ibu_hamil') {
        base.umurIbu = p.umurIbu;
      }

      return base;
    });

    res.status(200).json({
      success: true,
      message: 'Pasien retrieved successfully',
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        limit: parseInt(limit)
      },
      data
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET PASIEN BY ID
// ==========================================
const getPasienById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const pasien = await Pasien.findByPk(id, {
      include: [{ model: CheckupSession, as: 'checkup_sessions' }]
    });

    if (!pasien) {
      return res.status(404).json({
        success: false,
        message: 'Pasien not found'
      });
    }

    const data = pasien.toJSON();

    if (pasien.patientType === 'ibu_hamil') {
      data.umurIbu = pasien.umurIbu;
    }

    res.status(200).json({
      success: true,
      message: 'Pasien retrieved successfully',
      data
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// DELETE PASIEN
// ==========================================
const deletePasien = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Pasien.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Pasien not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pasien deleted successfully',
      data: { deleted_id: id }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADD PASIEN TO QUEUE (hanya tanggal yang harus beda)
// ==========================================
// const addPasienToQueue = async (req, res, next) => {
//   try {
//     const { pasienId, tanggal } = req.body;

//     const pasien = await Pasien.findByPk(pasienId);
//     if (!pasien) {
//       return res.status(404).json({
//         success: false,
//         message: 'Pasien not found'
//       });
//     }

//     const sessionDate = tanggal || new Date().toISOString().slice(0, 10);

//     const existing = await CheckupSession.findOne({
//       where: { patient_id: pasienId, session_date: sessionDate }
//     });

//     if (existing) {
//       return res.status(400).json({
//         success: false,
//         message: 'Pasien sudah ada di antrian tanggal ini'
//       });
//     }

//     // Buat checkup session
//     const checkupSession = await CheckupSession.create({
//       patientId: pasienId,
//       sessionDate: sessionDate,
//       completed: false,
//       createdById: req.user.id
//     });

//     // TAMBAHAN: Buat measurement kosong untuk session ini
//     const { Measurement } = require('../models');
//     await Measurement.create({
//       checkupSessionId: checkupSession.id,
//       createdById: req.user.id,
//       updatedById: req.user.id
//     });

//     res.status(201).json({
//       success: true,
//       message: 'Pasien berhasil ditambahkan ke antrian',
//       data: {
//         checkupSession,
//         pasien: {
//           id: pasien.id,
//           name: pasien.name,
//           patientType: pasien.patientType
//         }
//       }
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// ==========================================
// ADD PASIEN TO QUEUE (harus tanggal/bulan/tahun yang beda)
// ==========================================
const addPasienToQueue = async (req, res, next) => {
  try {
    const { pasienId, tanggal } = req.body;

    const pasien = await Pasien.findByPk(pasienId);
    if (!pasien) {
      return res.status(404).json({
        success: false,
        message: 'Pasien tidak ditemukan'
      });
    }

    const sessionDate = tanggal || new Date().toISOString().slice(0, 10);
    
    // Parse tanggal untuk mendapatkan bulan dan tahun
    const date = new Date(sessionDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    // Hitung tanggal awal dan akhir bulan
    const monthStr = String(month).padStart(2, '0');
    const startOfMonth = `${year}-${monthStr}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const endOfMonth = `${year}-${monthStr}-${String(endDay).padStart(2, '0')}`;

    // Cek apakah pasien sudah ada di antrian di bulan dan tahun yang sama
    const existingInMonth = await CheckupSession.findOne({
      where: { 
        patientId: pasienId,
        sessionDate: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    if (existingInMonth) {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      
      return res.status(400).json({
        success: false,
        message: `Pasien sudah ada di antrian untuk bulan ${monthNames[month - 1]} ${year} (tercatat pada tanggal ${existingInMonth.sessionDate}). Satu pasien hanya bisa ditambahkan satu kali per bulan.`
      });
    }

    // Buat checkup session
    const checkupSession = await CheckupSession.create({
      patientId: pasienId,
      sessionDate: sessionDate,
      completed: false,
      createdById: req.user.id
    });

    // TAMBAHAN: Buat measurement kosong untuk session ini
    const { Measurement } = require('../models');
    await Measurement.create({
      checkupSessionId: checkupSession.id,
      createdById: req.user.id,
      updatedById: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Pasien berhasil ditambahkan ke antrian',
      data: {
        checkupSession,
        pasien: {
          id: pasien.id,
          name: pasien.name,
          patientType: pasien.patientType
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// GET STATISTIK PASIEN
// ==========================================
const getStatistikPasien = async (req, res) => {
  try {
    const jumlahBalita = await Pasien.count({ where: { patientType: 'balita' } });
    const jumlahIbuHamil = await Pasien.count({ where: { patientType: 'ibu_hamil' } });
    const totalPasien = await Pasien.count();

    return res.status(200).json({
      success: true,
      data: {
        jumlahBalita,
        jumlahIbuHamil,
        totalPasien,
      },
    });
  } catch (error) {
    console.error('Error in getStatistikPasien:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data statistik pasien.',
    });
  }
};

module.exports = {
  createPasien,
  getAllPasien,
  getPasienById,
  updatePasien,
  deletePasien,
  addPasienToQueue,
  getStatistikPasien
};
