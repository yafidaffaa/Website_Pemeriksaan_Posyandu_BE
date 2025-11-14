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
// FUNGSI VALIDASI LENGKAP
// ==========================================
const validatePatientData = (data, patientType, isUpdate = false) => {
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validasi untuk BALITA
  if (patientType === 'balita') {
    // Nama anak
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || !data.name.trim()) {
        errors.push('Nama anak wajib diisi');
      } else {
        if (data.name.trim().length < 3) errors.push('Nama anak minimal 3 karakter');
        if (data.name.trim().length > 100) errors.push('Nama anak maksimal 100 karakter');
        if (!/^[a-zA-Z\s.'-]+$/.test(data.name)) errors.push('Nama anak hanya boleh mengandung huruf dan spasi');
      }
    }

    // Nama ibu
    if (!isUpdate || data.motherName !== undefined) {
      if (!data.motherName || !data.motherName.trim()) {
        errors.push('Nama ibu wajib diisi');
      } else {
        if (data.motherName.trim().length < 3) errors.push('Nama ibu minimal 3 karakter');
        if (data.motherName.trim().length > 100) errors.push('Nama ibu maksimal 100 karakter');
        if (!/^[a-zA-Z\s.'-]+$/.test(data.motherName)) errors.push('Nama ibu hanya boleh mengandung huruf dan spasi');
      }
    }

    // Gender
    if (!isUpdate || data.gender !== undefined) {
      if (!data.gender) {
        errors.push('Jenis kelamin wajib dipilih');
      } else if (!['L', 'P'].includes(data.gender)) {
        errors.push('Jenis kelamin harus L atau P');
      }
    }

    // RT
    if (!isUpdate || data.rt !== undefined) {
      if (!data.rt || !data.rt.trim()) {
        errors.push('RT wajib diisi');
      } else {
        if (!/^\d+$/.test(data.rt)) {
          errors.push('RT harus berupa angka');
        } else {
          const rtNum = parseInt(data.rt);
          if (rtNum < 1) errors.push('RT minimal 1');
          if (rtNum > 999) errors.push('RT maksimal 999');
        }
      }
    }

    // Tanggal lahir
    if (!isUpdate || data.birthDate !== undefined) {
      if (!data.birthDate) {
        errors.push('Tanggal lahir wajib diisi');
      } else {
        const birthDate = new Date(data.birthDate);
        if (isNaN(birthDate.getTime())) {
          errors.push('Format tanggal lahir tidak valid');
        } else {
          if (birthDate > today) errors.push('Tanggal lahir tidak boleh lebih dari hari ini');
          const age = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (age > 5) errors.push('Usia anak melebihi 5 tahun (bukan kategori balita)');
        }
      }
    }

    // PUS
    if (!isUpdate || data.pus !== undefined) {
      if (!data.pus) {
        errors.push('PUS wajib dipilih');
      } else if (!['Ya', 'Tidak'].includes(data.pus)) {
        errors.push('PUS harus Ya atau Tidak');
      }
    }

    // WUS
    if (!isUpdate || data.wus !== undefined) {
      if (!data.wus) {
        errors.push('WUS wajib dipilih');
      } else if (!['Ya', 'Tidak'].includes(data.wus)) {
        errors.push('WUS harus Ya atau Tidak');
      }
    }
  }

  // Validasi untuk IBU HAMIL
  if (patientType === 'ibu_hamil') {
    // Nama ibu
    if (!isUpdate || data.name !== undefined) {
      if (!data.name || !data.name.trim()) {
        errors.push('Nama ibu wajib diisi');
      } else {
        if (data.name.trim().length < 3) errors.push('Nama ibu minimal 3 karakter');
        if (data.name.trim().length > 100) errors.push('Nama ibu maksimal 100 karakter');
        if (!/^[a-zA-Z\s.'-]+$/.test(data.name)) errors.push('Nama ibu hanya boleh mengandung huruf dan spasi');
      }
    }

    // Nama suami
    if (!isUpdate || data.namaSuami !== undefined) {
      if (!data.namaSuami || !data.namaSuami.trim()) {
        errors.push('Nama suami wajib diisi');
      } else {
        if (data.namaSuami.trim().length < 3) errors.push('Nama suami minimal 3 karakter');
        if (data.namaSuami.trim().length > 100) errors.push('Nama suami maksimal 100 karakter');
        if (!/^[a-zA-Z\s.'-]+$/.test(data.namaSuami)) errors.push('Nama suami hanya boleh mengandung huruf dan spasi');
      }
    }

    // NIK
    if (!isUpdate || data.nik !== undefined) {
      if (!data.nik || !data.nik.trim()) {
        errors.push('NIK wajib diisi');
      } else {
        if (!/^\d{16}$/.test(data.nik)) {
          errors.push('NIK harus 16 digit angka');
        }
      }
    }

    // No KK
    if (!isUpdate || data.noKK !== undefined) {
      if (!data.noKK || !data.noKK.trim()) {
        errors.push('No KK wajib diisi');
      } else {
        if (!/^\d{16}$/.test(data.noKK)) {
          errors.push('No KK harus 16 digit angka');
        }
      }
    }

    // RT
    if (!isUpdate || data.rt !== undefined) {
      if (!data.rt || !data.rt.trim()) {
        errors.push('RT wajib diisi');
      } else {
        if (!/^\d+$/.test(data.rt)) {
          errors.push('RT harus berupa angka');
        } else {
          const rtNum = parseInt(data.rt);
          if (rtNum < 1) errors.push('RT minimal 1');
          if (rtNum > 999) errors.push('RT maksimal 999');
        }
      }
    }

    // Tanggal lahir
    if (!isUpdate || data.birthDate !== undefined) {
      if (!data.birthDate) {
        errors.push('Tanggal lahir wajib diisi');
      } else {
        const birthDate = new Date(data.birthDate);
        if (isNaN(birthDate.getTime())) {
          errors.push('Format tanggal lahir tidak valid');
        } else {
          if (birthDate > today) errors.push('Tanggal lahir tidak boleh lebih dari hari ini');
          const age = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          if (age < 15) errors.push('Usia ibu terlalu muda (minimal 15 tahun)');
          if (age > 55) errors.push('Usia ibu melebihi batas wajar untuk kehamilan');
        }
      }
    }

    // Gravida
    if (!isUpdate || data.gravida !== undefined) {
      if (data.gravida === undefined || data.gravida === null || data.gravida === '') {
        errors.push('Gravida wajib diisi');
      } else {
        if (!/^\d+$/.test(String(data.gravida))) {
          errors.push('Gravida harus berupa angka');
        } else {
          const gravida = parseInt(data.gravida);
          if (gravida < 1) errors.push('Gravida minimal 1');
          if (gravida > 15) errors.push('Gravida maksimal 15');
        }
      }
    }

    // Partus
    if (!isUpdate || data.partus !== undefined) {
      if (data.partus === undefined || data.partus === null || data.partus === '') {
        errors.push('Partus wajib diisi');
      } else {
        if (!/^\d+$/.test(String(data.partus))) {
          errors.push('Partus harus berupa angka');
        } else {
          const partus = parseInt(data.partus);
          if (partus < 0) errors.push('Partus minimal 0');
          if (partus > 10) errors.push('Partus maksimal 10');
        }
      }
    }

    // Abortus
    if (!isUpdate || data.abortus !== undefined) {
      if (data.abortus === undefined || data.abortus === null || data.abortus === '') {
        errors.push('Abortus wajib diisi');
      } else {
        if (!/^\d+$/.test(String(data.abortus))) {
          errors.push('Abortus harus berupa angka');
        } else {
          const abortus = parseInt(data.abortus);
          if (abortus < 0) errors.push('Abortus minimal 0');
          if (abortus > 5) errors.push('Abortus maksimal 5');
        }
      }
    }

    // Jarak persalinan sebelumnya
    if (!isUpdate || data.jarakPersalinanSebelumnya !== undefined) {
      if (data.jarakPersalinanSebelumnya === undefined || data.jarakPersalinanSebelumnya === null || data.jarakPersalinanSebelumnya === '') {
        errors.push('Jarak persalinan sebelumnya wajib diisi');
      } else {
        if (!/^\d+$/.test(String(data.jarakPersalinanSebelumnya))) {
          errors.push('Jarak persalinan harus berupa angka');
        } else {
          const jarak = parseInt(data.jarakPersalinanSebelumnya);
          if (jarak < 0) errors.push('Jarak persalinan minimal 0 bulan');
          if (jarak > 240) errors.push('Jarak persalinan tidak wajar (maksimal 240 bulan/20 tahun)');
        }
      }
    }

    // Usia kandungan
    if (!isUpdate || data.usiaKandunganMinggu !== undefined) {
      if (data.usiaKandunganMinggu === undefined || data.usiaKandunganMinggu === null || data.usiaKandunganMinggu === '') {
        errors.push('Usia kandungan wajib diisi');
      } else {
        if (!/^\d+$/.test(String(data.usiaKandunganMinggu))) {
          errors.push('Usia kandungan harus berupa angka');
        } else {
          const usia = parseInt(data.usiaKandunganMinggu);
          if (usia < 1) errors.push('Usia kandungan minimal 1 minggu');
          if (usia > 42) errors.push('Usia kandungan maksimal 42 minggu');
        }
      }
    }

    // Tanggal pemeriksaan pertama
    if (!isUpdate || data.tglPemeriksaanPertama !== undefined) {
      if (!data.tglPemeriksaanPertama) {
        errors.push('Tanggal pemeriksaan pertama wajib diisi');
      } else {
        const tglPemeriksaan = new Date(data.tglPemeriksaanPertama);
        if (isNaN(tglPemeriksaan.getTime())) {
          errors.push('Format tanggal pemeriksaan tidak valid');
        } else if (tglPemeriksaan > today) {
          errors.push('Tanggal pemeriksaan tidak boleh lebih dari hari ini');
        }
      }
    }

    // HPM
    if (!isUpdate || data.hpm !== undefined) {
      if (!data.hpm) {
        errors.push('HPM wajib diisi');
      } else {
        const hpmDate = new Date(data.hpm);
        if (isNaN(hpmDate.getTime())) {
          errors.push('Format HPM tidak valid');
        } else if (hpmDate > today) {
          errors.push('HPM tidak boleh lebih dari hari ini');
        }
      }
    }

    // HPL
    if (!isUpdate || data.hpl !== undefined) {
      if (!data.hpl) {
        errors.push('HPL wajib diisi');
      } else {
        const hplDate = new Date(data.hpl);
        if (isNaN(hplDate.getTime())) {
          errors.push('Format HPL tidak valid');
        } else {
          const oneYearFromNow = new Date(today);
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          if (hplDate < today) errors.push('HPL harus tanggal di masa depan');
          if (hplDate > oneYearFromNow) errors.push('HPL tidak wajar (lebih dari 1 tahun dari sekarang)');
        }
      }
    }

    // Golongan darah
    if (!isUpdate || data.golonganDarah !== undefined) {
      if (!data.golonganDarah) {
        errors.push('Golongan darah wajib dipilih');
      } else if (!['A', 'B', 'AB', 'O'].includes(data.golonganDarah)) {
        errors.push('Golongan darah harus A, B, AB, atau O');
      }
    }

    // Nomor jaminan (opsional)
    if (data.nomorJaminan && data.nomorJaminan.trim()) {
      if (!/^\d{9,11}$/.test(data.nomorJaminan)) {
        errors.push('Nomor jaminan harus 9-11 digit angka');
      }
    }

    // No telepon
    if (!isUpdate || data.noTelp !== undefined) {
      if (!data.noTelp || !data.noTelp.trim()) {
        errors.push('No telepon wajib diisi');
      } else if (!/^\d{10,13}$/.test(data.noTelp)) {
        errors.push('No telepon harus 10-13 digit angka');
      }
    }
  }

  return errors;
};

// ==========================================
// CREATE PASIEN
// ==========================================
const createPasien = async (req, res, next) => {
  try {
    const { patientType } = req.body;
    
    if (!patientType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipe pasien wajib diisi' 
      });
    }

    if (!['balita', 'ibu_hamil'].includes(patientType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tipe pasien harus balita atau ibu_hamil' 
      });
    }

    // Validasi menggunakan fungsi baru
    const validationErrors = validatePatientData(req.body, patientType, false);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: validationErrors
      });
    }

    const allowedFields = {
      balita: ['patientType', 'name', 'birthDate', 'gender', 'motherName', 'rt', 'kb', 'pus', 'wus', 'imunisasi', 'address'],
      ibu_hamil: [
        'patientType', 'name', 'birthDate', 'rt', 'nik', 'noKK', 'namaSuami',
        'gravida', 'partus', 'abortus', 'jarakPersalinanSebelumnya',
        'usiaKandunganMinggu', 'tglPemeriksaanPertama', 'hpm', 'hpl',
        'nomorJaminan', 'noTelp', 'golonganDarah', 'address'
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

    // Buat measurement kosong untuk session ini
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
    
    if (!pasien) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pasien tidak ditemukan' 
      });
    }

    const { patientType } = pasien;

    // Validasi menggunakan fungsi baru
    const validationErrors = validatePatientData(req.body, patientType, true);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validasi gagal',
        errors: validationErrors
      });
    }

    const allowedFields = {
      balita: ['name', 'birthDate', 'gender', 'motherName', 'rt', 'kb', 'pus', 'wus', 'imunisasi', 'address'],
      ibu_hamil: [
        'name', 'birthDate', 'rt', 'nik', 'noKK', 'namaSuami', 'gravida',
        'partus', 'abortus', 'jarakPersalinanSebelumnya', 'usiaKandunganMinggu',
        'tglPemeriksaanPertama', 'hpm', 'hpl', 'nomorJaminan', 'noTelp', 'golonganDarah', 'address'
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
      message: 'Data pasien berhasil diambil',
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
        message: 'Pasien tidak ditemukan'
      });
    }

    const data = pasien.toJSON();

    if (pasien.patientType === 'ibu_hamil') {
      data.umurIbu = pasien.umurIbu;
    }

    res.status(200).json({
      success: true,
      message: 'Data pasien berhasil diambil',
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
        message: 'Pasien tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Pasien berhasil dihapus',
      data: { deleted_id: id }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// ADD PASIEN TO QUEUE
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

    // Buat measurement kosong untuk session ini
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