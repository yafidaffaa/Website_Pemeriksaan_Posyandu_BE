const { Measurement, CheckupSession, Pasien, User } = require('../models');
const { calculateChildZScore, calculatePregnantZScore, validateMeasurementData } = require('../utils/zscore');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// ==========================================
// ROLE PERMISSIONS - Field access control
// ==========================================
const allFieldsBalita = [
  'ageMonths', 'weightKg', 'heightCm', 'headCircCm', 'lilaCm',
  'asi', 'vitaminA', 'statusGizi', 'zScoreBMIU', 'stuntingStatus',
  'counselingNotes'
];

const allFieldsIbuHamil = [
  'ageMonthsPregnant', 'weightKgPregnant', 'heightCmPregnant', 'lilaCmPregnant',
  'zScoreBMIPregnant', 'tekananDarah', 'proteinUrine', 'reduksiUrine', 'testHiv',
  'testSifilis', 'testHbsAg', 'gds', 'ancTerpadu', 'HB', 'resiko', 'counselingNotes', 'stuntingStatus'
];

const rolePermissions = {
  meja2: {
    balita: allFieldsBalita.filter(f => f !== 'counselingNotes'),
    ibu_hamil: allFieldsIbuHamil.filter(
      f => !['counselingNotes', 'resiko'].includes(f)
    )
  },
  meja3: {
    balita: ['counselingNotes'],
    ibu_hamil: ['counselingNotes', 'resiko']
  }
};

// ==========================================
// HELPER: Filter input by role + patientType
// ==========================================
const filterAllowed = (input, role, patientType) => {
  const allowed = rolePermissions[role]?.[patientType] || [];
  const out = {};
  for (const key of allowed) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
};

// ==========================================
// HELPER: Calculate BMI
// ==========================================
const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  if (h <= 0) return null;
  return +(weightKg / (h * h)).toFixed(2);
};

// ==========================================
// HELPER: Calculate HPL (Perkiraan Persalinan)
// ==========================================
const calculatePerkiraanPersalinan = (patient) => {
  const hpm = patient.hpm || patient.hpm_date || patient.tgl_hpht || null;
  if (!hpm) return null;
  const d = new Date(hpm);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
};

// ==========================================
// HELPER: Calculate and save Z-scores (FIXED VERSION)
// ==========================================
const calculateAndSaveZScores = async (measurement, checkup) => {
  const patientType = checkup.patient.patientType;
  
  try {
    if (patientType === 'balita') {
      const weight = parseFloat(measurement.weightKg);
      const height = parseFloat(measurement.heightCm);
      const ageMonths = parseFloat(measurement.ageMonths);

      // Validasi data
      const validation = validateMeasurementData({
        weight,
        height,
        gender: checkup.patient.gender
      }, 'balita');

      if (!validation.isValid) {
        console.warn('[Validasi] Data balita tidak valid:', validation.errors);
        measurement.dataValues.validationErrors = validation.errors;
        return;
      }

      const bmi = calcBMI(weight, height);
      measurement.dataValues.bmi = bmi;

      if (weight > 0 && height > 0) {
        const zResult = calculateChildZScore({
          ageMonths,
          weight,
          height,
          gender: checkup.patient.gender
        });

        if (!zResult.error) {
          // ✅ PERBAIKAN: Pisahkan status gizi dan status stunting
          // Status Gizi dari BMI/U (classification)
          measurement.statusGizi = zResult.classification;
          measurement.zScoreBMIU = zResult.bmiForAgeZ;
          
          // Status Stunting dari TB/U (stuntingStatus) 
          measurement.stuntingStatus = zResult.stuntingStatus;
          
          // Simpan ke dataValues untuk response
          measurement.dataValues.zScoreBMI = zResult.bmiForAgeZ;
          measurement.dataValues.zScoreHeight = zResult.heightForAgeZ;
          measurement.dataValues.zClassification = zResult.classification;
          measurement.dataValues.stuntingStatus = zResult.stuntingStatus;
          
          console.log('✅ Z-Score Balita berhasil dihitung:');
          console.log('   - Status Gizi:', zResult.classification);
          console.log('   - Z-Score BMI/U:', zResult.bmiForAgeZ);
          console.log('   - Status Stunting:', zResult.stuntingStatus);
          console.log('   - Z-Score TB/U:', zResult.heightForAgeZ);
        } else {
          console.error('[ZScore Error]', zResult.error);
          measurement.dataValues.calculationError = zResult.error;
        }
      }

    } else if (patientType === 'ibu_hamil') {
  const weightP = parseFloat(measurement.weightKgPregnant);
  const heightP = parseFloat(measurement.heightCmPregnant);
  const lilaP = parseFloat(measurement.lilaCmPregnant);

  const validation = validateMeasurementData({
    weight: weightP,
    height: heightP,
    lila: lilaP
  }, 'ibu_hamil');

  if (!validation.isValid) {
    console.warn('[Validasi] Data ibu hamil tidak valid:', validation.errors);
    measurement.dataValues.validationErrors = validation.errors;
    return;
  }

  const bmiP = calcBMI(weightP, heightP);
  measurement.dataValues.bmiPregnant = bmiP;

  if (weightP > 0 && heightP > 0) {
    const zPreg = calculatePregnantZScore({
      weight: weightP,
      height: heightP,
      ageMonthsPregnant: measurement.ageMonthsPregnant,
      lila: lilaP
    });

    if (!zPreg.error) {
      // Simpan semua hasil perhitungan
      measurement.zScoreBMIPregnant = zPreg.zScore;
      measurement.stuntingStatus = zPreg.nutritionStatus;
      measurement.statusGizi = zPreg.classification;
      
      // Simpan ke dataValues untuk response
      measurement.dataValues.bmi = zPreg.bmi;
      measurement.dataValues.zScoreBMIPregnant = zPreg.zScore;
      measurement.dataValues.bmiClassification = zPreg.classification;
      measurement.dataValues.nutritionStatus = zPreg.nutritionStatus;
      measurement.dataValues.stuntingRisk = zPreg.stuntingRisk;
      measurement.dataValues.stuntingRiskDetail = zPreg.stuntingRiskDetail;
      measurement.dataValues.lilaStatus = zPreg.lilaStatus;
      
      console.log('✅ Status Gizi Ibu Hamil berhasil dihitung:');
      console.log('   - BMI:', bmiP);
      console.log('   - Klasifikasi:', zPreg.classification);
      console.log('   - Status Nutrisi:', zPreg.nutritionStatus);
      console.log('   - Risiko Stunting Bayi:', zPreg.stuntingRisk);
      console.log('   - Status LILA:', zPreg.lilaStatus || 'Tidak diukur');
    } else {
      console.error('[ZScore Error]', zPreg.error);
      measurement.dataValues.calculationError = zPreg.error;
    }

    const hpl = calculatePerkiraanPersalinan(checkup.patient);
    if (hpl) measurement.dataValues.perkiraanPersalinan = hpl;
  }
}

  } catch (err) {
    console.error('[ZScore Calculation Error]', err.message);
    measurement.dataValues.calculationError = 'Terjadi kesalahan dalam perhitungan. Silakan hubungi administrator.';
  }
};

// ==========================================
// HELPER: Validasi input data measurement
// ==========================================
const validateMeasurementInput = (data, patientType) => {
  const errors = [];

  if (patientType === 'balita') {
    // Validasi Weight (Berat Badan)
    if (data.weightKg !== undefined && data.weightKg !== null && data.weightKg !== '') {
      const weight = parseFloat(data.weightKg);
      if (isNaN(weight)) {
        errors.push('Berat badan harus berupa angka');
      } else if (weight < 0) {
        errors.push('Berat badan tidak boleh negatif');
      } else if (weight > 50) {
        errors.push('Berat badan tidak masuk akal (maksimal 50 kg untuk balita)');
      } else if (weight < 1) {
        errors.push('Berat badan terlalu rendah (minimal 1 kg)');
      }
    }

    // Validasi Height (Tinggi Badan)
    if (data.heightCm !== undefined && data.heightCm !== null && data.heightCm !== '') {
      const height = parseFloat(data.heightCm);
      if (isNaN(height)) {
        errors.push('Tinggi badan harus berupa angka');
      } else if (height < 0) {
        errors.push('Tinggi badan tidak boleh negatif');
      } else if (height > 150) {
        errors.push('Tinggi badan tidak masuk akal (maksimal 150 cm untuk balita)');
      } else if (height < 30) {
        errors.push('Tinggi badan terlalu rendah (minimal 30 cm)');
      }
    }

    // Validasi Head Circumference (Lingkar Kepala)
    if (data.headCircCm !== undefined && data.headCircCm !== null && data.headCircCm !== '') {
      const headCirc = parseFloat(data.headCircCm);
      if (isNaN(headCirc)) {
        errors.push('Lingkar kepala harus berupa angka');
      } else if (headCirc < 0) {
        errors.push('Lingkar kepala tidak boleh negatif');
      } else if (headCirc > 60) {
        errors.push('Lingkar kepala tidak masuk akal (maksimal 60 cm)');
      } else if (headCirc < 25) {
        errors.push('Lingkar kepala terlalu rendah (minimal 25 cm)');
      }
    }

    // Validasi LILA
    if (data.lilaCm !== undefined && data.lilaCm !== null && data.lilaCm !== '') {
      const lila = parseFloat(data.lilaCm);
      if (isNaN(lila)) {
        errors.push('LILA harus berupa angka');
      } else if (lila < 0) {
        errors.push('LILA tidak boleh negatif');
      } else if (lila > 30) {
        errors.push('LILA tidak masuk akal (maksimal 30 cm)');
      } else if (lila < 8) {
        errors.push('LILA terlalu rendah (minimal 8 cm)');
      }
    }

  } else if (patientType === 'ibu_hamil') {
    // Validasi Usia Kehamilan
    if (data.ageMonthsPregnant !== undefined && data.ageMonthsPregnant !== null && data.ageMonthsPregnant !== '') {
      const agePregnant = parseInt(data.ageMonthsPregnant);
      if (isNaN(agePregnant)) {
        errors.push('Usia kehamilan harus berupa angka');
      } else if (agePregnant < 0) {
        errors.push('Usia kehamilan tidak boleh negatif');
      } else if (agePregnant > 9) {
        errors.push('Usia kehamilan tidak boleh lebih dari 9 bulan');
      }
    }

    // Validasi Weight Pregnant (Berat Badan Ibu Hamil)
    if (data.weightKgPregnant !== undefined && data.weightKgPregnant !== null && data.weightKgPregnant !== '') {
      const weightPregnant = parseFloat(data.weightKgPregnant);
      if (isNaN(weightPregnant)) {
        errors.push('Berat badan harus berupa angka');
      } else if (weightPregnant < 0) {
        errors.push('Berat badan tidak boleh negatif');
      } else if (weightPregnant > 200) {
        errors.push('Berat badan tidak masuk akal (maksimal 200 kg)');
      } else if (weightPregnant < 30) {
        errors.push('Berat badan terlalu rendah (minimal 30 kg)');
      }
    }

    // Validasi Height Pregnant (Tinggi Badan Ibu Hamil)
    if (data.heightCmPregnant !== undefined && data.heightCmPregnant !== null && data.heightCmPregnant !== '') {
      const heightPregnant = parseFloat(data.heightCmPregnant);
      if (isNaN(heightPregnant)) {
        errors.push('Tinggi badan harus berupa angka');
      } else if (heightPregnant < 0) {
        errors.push('Tinggi badan tidak boleh negatif');
      } else if (heightPregnant > 220) {
        errors.push('Tinggi badan tidak masuk akal (maksimal 220 cm)');
      } else if (heightPregnant < 130) {
        errors.push('Tinggi badan terlalu rendah (minimal 130 cm)');
      }
    }

    // Validasi LILA Pregnant
    if (data.lilaCmPregnant !== undefined && data.lilaCmPregnant !== null && data.lilaCmPregnant !== '') {
      const lilaPregnant = parseFloat(data.lilaCmPregnant);
      if (isNaN(lilaPregnant)) {
        errors.push('LILA harus berupa angka');
      } else if (lilaPregnant < 0) {
        errors.push('LILA tidak boleh negatif');
      } else if (lilaPregnant > 50) {
        errors.push('LILA tidak masuk akal (maksimal 50 cm)');
      } else if (lilaPregnant < 15) {
        errors.push('LILA terlalu rendah (minimal 15 cm)');
      }
    }

    // Validasi Tekanan Darah
    if (data.tekananDarah !== undefined && data.tekananDarah !== null && data.tekananDarah !== '') {
      const bpRegex = /^\d{2,3}\/\d{2,3}$/;
      if (!bpRegex.test(data.tekananDarah)) {
        errors.push('Format tekanan darah harus seperti 120/80');
      } else {
        const [systolic, diastolic] = data.tekananDarah.split('/').map(Number);
        if (systolic < 70 || systolic > 250) {
          errors.push('Tekanan sistolik tidak normal (70-250 mmHg)');
        }
        if (diastolic < 40 || diastolic > 150) {
          errors.push('Tekanan diastolik tidak normal (40-150 mmHg)');
        }
        if (systolic <= diastolic) {
          errors.push('Tekanan sistolik harus lebih besar dari diastolik');
        }
      }
    }

    // Validasi GDS
    if (data.gds !== undefined && data.gds !== null && data.gds !== '') {
      const gds = parseFloat(data.gds);
      if (isNaN(gds)) {
        errors.push('GDS harus berupa angka');
      } else if (gds < 0) {
        errors.push('GDS tidak boleh negatif');
      } else if (gds > 600) {
        errors.push('GDS tidak masuk akal (maksimal 600 mg/dL)');
      }
    }

    // Validasi HB
    if (data.HB !== undefined && data.HB !== null && data.HB !== '') {
      const hb = parseFloat(data.HB);
      if (isNaN(hb)) {
        errors.push('HB harus berupa angka');
      } else if (hb < 0) {
        errors.push('HB tidak boleh negatif');
      } else if (hb > 20) {
        errors.push('HB tidak masuk akal (maksimal 20 g/dL)');
      } else if (hb < 5) {
        errors.push('HB terlalu rendah (minimal 5 g/dL)');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// ==========================================
// 1. UPSERT MEASUREMENT (UPDATE dengan validasi)
// ==========================================
const upsertMeasurement = async (req, res, next) => {
  try {
    const { checkupSessionId } = req.params;
    const user = req.user;
    const role = user.role;

    if (role === 'meja1') {
      return res.status(403).json({
        success: false,
        message: 'Meja 1 tidak memiliki akses untuk memasukkan data pemeriksaan.'
      });
    }

    const checkup = await CheckupSession.findByPk(checkupSessionId, {
      include: [{ model: Pasien, as: 'patient' }]
    });

    if (!checkup) {
      return res.status(404).json({
        success: false,
        message: 'Sesi pemeriksaan tidak ditemukan.'
      });
    }

    const patientType = checkup.patient.patientType;
    const allowedData = filterAllowed(req.body, role, patientType);

    // ✅ VALIDASI INPUT SEBELUM PROSES
    const validation = validateMeasurementInput(allowedData, patientType);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Data tidak valid',
        errors: validation.errors,
        suggestion: 'Periksa kembali data yang Anda masukkan. ' + validation.errors.join('. ')
      });
    }

    // Hitung umur otomatis untuk balita
    if (patientType === 'balita' && checkup.patient.birthDate) {
      const birthDate = new Date(checkup.patient.birthDate);
      const sessionDate = new Date(checkup.session_date || checkup.sessionDate || new Date());
      
      if (!isNaN(birthDate.getTime()) && !isNaN(sessionDate.getTime())) {
        const yearDiff = sessionDate.getFullYear() - birthDate.getFullYear();
        const monthDiff = sessionDate.getMonth() - birthDate.getMonth();
        const dayDiff = sessionDate.getDate() - birthDate.getDate();
        
        let totalMonths = yearDiff * 12 + monthDiff;
        
        if (dayDiff < 0) {
          totalMonths--;
        }
        
        // Force set ageMonths, tidak peduli role
        allowedData.ageMonths = Math.max(0, totalMonths);
        
        console.log('✅ Umur balita dihitung otomatis:', {
          birthDate: birthDate.toISOString().split('T')[0],
          sessionDate: sessionDate.toISOString().split('T')[0],
          ageMonths: allowedData.ageMonths
        });
      }
    }

    if (Object.keys(allowedData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada data yang valid untuk disimpan.'
      });
    }

    let measurement = await Measurement.findOne({
      where: { checkup_session_id: checkupSessionId }
    });

    if (measurement) {
      await measurement.update({
        ...allowedData,
        updated_by_id: user.id
      });
    } else {
      measurement = await Measurement.create({
        checkup_session_id: checkupSessionId,
        created_by_id: user.id,
        updated_by_id: user.id,
        ...allowedData
      });
    }

    await measurement.reload();
    await calculateAndSaveZScores(measurement, checkup);
    await measurement.save();
    await measurement.reload();

    res.status(201).json({
      success: true,
      message: 'Data pemeriksaan berhasil disimpan',
      data: measurement,
      calculationInfo: {
        ageMonths: measurement.ageMonths,
        bmi: measurement.dataValues.bmi || measurement.dataValues.bmiPregnant,
        zScore: patientType === 'balita' 
          ? measurement.zScoreBMIU || measurement.dataValues.zScoreBMI 
          : measurement.zScoreBMIPregnant || measurement.dataValues.zScoreBMIPregnant,
        zScoreBMIU: measurement.zScoreBMIU,
        zScoreBMIPregnant: measurement.zScoreBMIPregnant,
        classification: measurement.statusGizi || measurement.dataValues.zClassification || measurement.dataValues.zClassificationPregnant,
        stuntingStatus: measurement.stuntingStatus
      }
    });

  } catch (err) {
    console.error('[upsertMeasurement Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat menyimpan data pemeriksaan.',
      error: err.message
    });
  }
};

// ==========================================
// 2. GET MEASUREMENT BY SESSION
// ==========================================
const getMeasurementBySession = async (req, res, next) => {
  try {
    const { checkupSessionId } = req.params;

    const measurement = await Measurement.findOne({
      where: { checkup_session_id: checkupSessionId },
      include: [
        {
          model: CheckupSession,
          as: 'checkup_session',
          include: [{ model: Pasien, as: 'patient' }]
        },
        {
          model: User,
          as: 'created_by',
          attributes: ['id', 'username', 'nama_lengkap', 'role']
        },
        {
          model: User,
          as: 'updated_by',
          attributes: ['id', 'username', 'nama_lengkap', 'role']
        }
      ]
    });

    if (!measurement) {
      return res.status(200).json({
        success: true,
        message: 'Belum ada data pemeriksaan untuk sesi ini',
        data: null
      });
    }

    // Hitung ulang Z-scores untuk memastikan data terbaru
    await calculateAndSaveZScores(measurement, measurement.checkup_session);
    await measurement.save();
    await measurement.reload();

    // Tambahan data untuk ibu hamil
    if (measurement.checkup_session?.patient?.patientType === 'ibu_hamil') {
      measurement.dataValues.perkiraanPersalinan =
        measurement.perkiraanPersalinan || calculatePerkiraanPersalinan(measurement.checkup_session.patient);

      const hpm = measurement.checkup_session.patient.hpm || measurement.checkup_session.patient.hpm_date;
      if (hpm) {
        const sessionDate = measurement.checkup_session.session_date || measurement.checkup_session.created_at;
        const diffMs = new Date(sessionDate) - new Date(hpm);
        const minggu = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
        measurement.dataValues.usiaKehamilanMinggu = minggu;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Data pemeriksaan berhasil diambil',
      data: measurement
    });
  } catch (err) {
    console.error('[getMeasurementBySession Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil data pemeriksaan. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// 3. GET MEASUREMENT FOR EDIT
// ==========================================
const getMeasurementForEdit = async (req, res, next) => {
  try {
    const { checkupSessionId } = req.params;
    const role = req.user.role;

    if (role === 'meja1') {
      return res.status(403).json({
        success: false,
        message: 'Meja 1 tidak memiliki akses untuk mengedit data pemeriksaan.'
      });
    }

    const checkup = await CheckupSession.findByPk(checkupSessionId, {
      include: [{ model: Pasien, as: 'patient' }]
    });

    if (!checkup) {
      return res.status(404).json({
        success: false,
        message: 'Sesi pemeriksaan tidak ditemukan.'
      });
    }

    const patientType = checkup.patient.patientType;
    const editable = rolePermissions[role]?.[patientType] || [];

    const measurement = await Measurement.findOne({
      where: { checkup_session_id: checkupSessionId }
    });

    const current = {};
    if (measurement) {
      for (const f of editable) {
        current[f] = measurement[f];
      }
    }

    res.status(200).json({
      success: true,
      message: 'Data form edit berhasil diambil',
      data: {
        patientType,
        patientName: checkup.patient.name,
        sessionDate: checkup.session_date,
        editableFields: editable,
        currentData: current,
        measurementId: measurement?.id || null
      }
    });
  } catch (err) {
    console.error('[getMeasurementForEdit Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil data untuk edit. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// 4. GET ALL MEASUREMENTS (LIST - Meja1 only)
// ==========================================
const getAllMeasurements = async (req, res, next) => {
  try {
    const { month, year, patientType, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let dateFilter = {};
    if (month && year) {
      const mm = String(month).padStart(2, '0');
      const start = `${year}-${mm}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;
      dateFilter.session_date = { [Op.between]: [start, end] };
    } else if (year) {
      dateFilter.session_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }

    const { count, rows } = await Measurement.findAndCountAll({
      include: [
        {
          model: CheckupSession,
          as: 'checkup_session',
          where: dateFilter,
          required: true,
          include: [
            {
              model: Pasien,
              as: 'patient',
              where: patientType ? { patientType } : {},
              required: true
            }
          ]
        },
        {
          model: User,
          as: 'created_by',
          attributes: ['id', 'username', 'nama_lengkap']
        },
        {
          model: User,
          as: 'updated_by',
          attributes: ['id', 'username', 'nama_lengkap']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: [[{ model: CheckupSession, as: 'checkup_session' }, 'session_date', 'DESC']]
    });

    const data = rows.map((m, idx) => {
      const p = m.checkup_session.patient;
      const isComplete =
        p.patientType === 'balita'
          ? m.weightKg != null && m.heightCm != null && m.ageMonths != null
          : m.lilaCmPregnant != null || (m.weightKgPregnant != null && m.ageMonthsPregnant != null);

      return {
        no: offset + idx + 1,
        measurementId: m.id,
        sessionId: m.checkup_session.id,
        sessionDate: m.checkup_session.session_date,
        isDataComplete: isComplete,
        completed: m.checkup_session.completed,
        patient: {
          id: p.id,
          patientType: p.patientType,
          name: p.name,
          gender: p.gender,
          rt: p.rt || null,
          motherName: p.motherName || null,
          nik: p.nik || null
        },
        measurementSummary:
          p.patientType === 'balita'
            ? {
                ageMonths: m.ageMonths,
                weightKg: m.weightKg,
                heightCm: m.heightCm,
                stuntingStatus: m.stuntingStatus || 'Belum ada data',
                statusGizi: m.statusGizi || 'Belum ada data'
              }
            : {
                ageMonthsPregnant: m.ageMonthsPregnant,
                weightKgPregnant: m.weightKgPregnant,
                lilaCmPregnant: m.lilaCmPregnant,
                zScoreBMIPregnant: m.zScoreBMIPregnant,
                stuntingStatus: m.stuntingStatus || 'Belum ada data'
              }
      };
    });

    res.status(200).json({
      success: true,
      message: 'Data pemeriksaan berhasil diambil',
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        limit: parseInt(limit)
      },
      data
    });
  } catch (err) {
    console.error('[getAllMeasurements Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil daftar pemeriksaan. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// 5. GET MEASUREMENT BY ID (Meja1 only)
// ==========================================
const getMeasurementById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const m = await Measurement.findByPk(id, {
      include: [
        {
          model: CheckupSession,
          as: 'checkup_session',
          include: [{ model: Pasien, as: 'patient' }]
        },
        {
          model: User,
          as: 'created_by',
          attributes: ['id', 'username', 'nama_lengkap']
        },
        {
          model: User,
          as: 'updated_by',
          attributes: ['id', 'username', 'nama_lengkap']
        }
      ]
    });

    if (!m) {
      return res.status(404).json({
        success: false,
        message: 'Data pemeriksaan tidak ditemukan. Pastikan ID pemeriksaan sudah benar.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data pemeriksaan berhasil diambil',
      data: m
    });
  } catch (err) {
    console.error('[getMeasurementById Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil detail pemeriksaan. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// 6. EXPORT COMMON
// ==========================================
const exportCommon = async (req, res, next, scope) => {
  try {
    const { month, year, patientType } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Bulan dan tahun harus diisi untuk melakukan export data.'
      });
    }

    const mm = String(month).padStart(2, '0');
    const start = `${year}-${mm}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const end = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;

    const checkups = await CheckupSession.findAll({
      where: { session_date: { [Op.between]: [start, end] } },
      include: [
        {
          model: Pasien,
          as: 'patient',
          where: patientType ? { patientType } : {},
          required: true
        },
        { model: Measurement, as: 'measurements' }
      ],
      order: [['session_date', 'ASC']]
    });

    if (checkups.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Tidak ada data pemeriksaan untuk periode ${month}/${year}. Pastikan sudah ada data yang diinput.`
      });
    }

    const workbook = new ExcelJS.Workbook();
    
    if (patientType === 'balita') {
      createBalitaSheet(workbook, checkups, scope);
    } else if (patientType === 'ibu_hamil') {
      createIbuHamilSheet(workbook, checkups, scope);
    } else {
      const balitaData = checkups.filter(c => c.patient.patientType === 'balita');
      const ibuHamilData = checkups.filter(c => c.patient.patientType === 'ibu_hamil');
      
      if (balitaData.length > 0) {
        createBalitaSheet(workbook, balitaData, scope);
      }
      if (ibuHamilData.length > 0) {
        createIbuHamilSheet(workbook, ibuHamilData, scope);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const typeLabel = patientType ? `_${patientType}` : '_semua';
    const filename = `Export_${scope}_${month}_${year}${typeLabel}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (err) {
    console.error('[exportCommon Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat melakukan export data. Silakan coba lagi atau hubungi administrator.',
      error: err.message
    });
  }
};

// ==========================================
// CREATE BALITA SHEET
// ==========================================
const createBalitaSheet = (workbook, checkups, scope) => {
  const sheet = workbook.addWorksheet('Data Balita');

  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Tanggal Pemeriksaan', key: 'tgl', width: 15 },
    { header: 'Nama Balita', key: 'nama', width: 25 },
    { header: 'Tanggal Lahir', key: 'tglLahir', width: 15 },
    { header: 'Jenis Kelamin', key: 'gender', width: 12 },
    { header: 'Nama Ibu', key: 'namaIbu', width: 25 },
    { header: 'RT', key: 'rt', width: 8 },
    { header: 'Umur (bulan)', key: 'umur', width: 12 },
    { header: 'Berat Badan (kg)', key: 'bb', width: 15 },
    { header: 'Tinggi Badan (cm)', key: 'tb', width: 15 },
    { header: 'Lingkar Kepala (cm)', key: 'lk', width: 15 },
    { header: 'LILA (cm)', key: 'lila', width: 12 },
    { header: 'ASI', key: 'asi', width: 15 },
    { header: 'Vitamin A', key: 'vitA', width: 12 },
    { header: 'Status Gizi', key: 'statusGizi', width: 20 },
    { header: 'Z-Score BMI/U', key: 'zscore', width: 15 },
    { header: 'Status Stunting', key: 'stunting', width: 20 },
    { header: 'Imunisasi', key: 'imunisasi', width: 30 },
    { header: 'KB Ibu', key: 'kb', width: 15 },
    { header: 'Catatan Konseling', key: 'catatan', width: 40 }
  ];

  checkups.forEach((c, i) => {
    const m = c.measurements[0];
    const p = c.patient;

    let umurBulan = null;
    if (p.birthDate) {
      const sessionDate = new Date(c.session_date);
      const birth = new Date(p.birthDate);
      umurBulan = Math.floor((sessionDate - birth) / (1000 * 60 * 60 * 24 * 30.4375));
    }

    sheet.addRow({
      no: i + 1,
      tgl: c.sessionDate,
      nama: p.name || '',
      tglLahir: p.birthDate || '',
      gender: p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      namaIbu: p.motherName || '',
      rt: p.rt || '',
      umur: m?.ageMonths || umurBulan || '',
      bb: m?.weightKg || '',
      tb: m?.heightCm || '',
      lk: m?.headCircCm || '',
      lila: m?.lilaCm || '',
      asi: m?.asi || '',
      vitA: m?.vitaminA || '',
      statusGizi: m?.statusGizi || '',
      zscore: m?.zScoreBMIU || '',
      stunting: m?.stuntingStatus || '',
      imunisasi: p.imunisasi || '',
      kb: p.kb || '',
      catatan: m?.counselingNotes || ''
    });
  });

  styleSheet(sheet);
};

// ==========================================
// CREATE IBU HAMIL SHEET
// ==========================================
const createIbuHamilSheet = (workbook, checkups, scope) => {
  const sheet = workbook.addWorksheet('Data Ibu Hamil');

  sheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Tanggal Pemeriksaan', key: 'tgl', width: 15 },
    { header: 'NIK', key: 'nik', width: 20 },
    { header: 'No. KK', key: 'noKK', width: 20 },
    { header: 'Nama Ibu', key: 'nama', width: 25 },
    { header: 'Tanggal Lahir', key: 'tglLahir', width: 15 },
    { header: 'Umur (tahun)', key: 'umurTahun', width: 12 },
    { header: 'Nama Suami', key: 'namaSuami', width: 25 },
    { header: 'RT', key: 'rt', width: 8 },
    { header: 'No. Telp', key: 'noTelp', width: 15 },
    { header: 'Golongan Darah', key: 'golDarah', width: 12 },
    { header: 'Gravida', key: 'gravida', width: 10 },
    { header: 'Partus', key: 'partus', width: 10 },
    { header: 'Abortus', key: 'abortus', width: 10 },
    { header: 'Jarak Persalinan', key: 'jarakPersalinan', width: 15 },
    { header: 'HPM', key: 'hpm', width: 15 },
    { header: 'HPL', key: 'hpl', width: 15 },
    { header: 'Usia Kehamilan (bulan)', key: 'usiaHamil', width: 18 },
    { header: 'Berat Badan (kg)', key: 'bb', width: 15 },
    { header: 'Tinggi Badan (cm)', key: 'tb', width: 15 },
    { header: 'LILA (cm)', key: 'lila', width: 12 },
    { header: 'Tekanan Darah', key: 'tensi', width: 15 },
    { header: 'HB (g/dL)', key: 'hb', width: 12 },
    { header: 'GDS (mg/dL)', key: 'gds', width: 12 },
    { header: 'Protein Urine', key: 'proteinUrine', width: 12 },
    { header: 'Reduksi Urine', key: 'reduksiUrine', width: 12 },
    { header: 'Test HIV', key: 'testHiv', width: 12 },
    { header: 'Test Sifilis', key: 'testSifilis', width: 12 },
    { header: 'Test HBsAg', key: 'testHbsAg', width: 12 },
    { header: 'ANC Terpadu', key: 'ancTerpadu', width: 12 },
    { header: 'Z-Score BMI', key: 'zscore', width: 15 },
    { header: 'Status Stunting', key: 'stunting', width: 20 },
    { header: 'Resiko', key: 'resiko', width: 15 },
    { header: 'Nomor Jaminan', key: 'nomorJaminan', width: 20 },
    { header: 'Catatan Konseling', key: 'catatan', width: 40 }
  ];

  checkups.forEach((c, i) => {
    const m = c.measurements[0];
    const p = c.patient;

    let umurTahun = null;
    if (p.birthDate) {
      const today = new Date();
      const birth = new Date(p.birthDate);
      umurTahun = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        umurTahun--;
      }
    }

    sheet.addRow({
      no: i + 1,
      tgl: c.sessionDate,
      nik: p.nik || '',
      noKK: p.noKK || '',
      nama: p.name || '',
      tglLahir: p.birthDate || '',
      umurTahun: p.ageInYears || umurTahun || '',
      namaSuami: p.namaSuami || '',
      rt: p.rt || '',
      noTelp: p.noTelp || '',
      golDarah: p.golonganDarah || '',
      gravida: p.gravida || '',
      partus: p.partus || '',
      abortus: p.abortus || '',
      jarakPersalinan: p.jarakPersalinanSebelumnya || '',
      hpm: p.hpm || '',
      hpl: p.hpl || '',
      usiaHamil: m?.ageMonthsPregnant || p.usiaKandunganMinggu || '',
      bb: m?.weightKgPregnant || '',
      tb: m?.heightCmPregnant || '',
      lila: m?.lilaCmPregnant || '',
      tensi: m?.tekananDarah || '',
      hb: m?.HB || '',
      gds: m?.gds || '',
      proteinUrine: m?.proteinUrine || '',
      reduksiUrine: m?.reduksiUrine || '',
      testHiv: m?.testHiv || '',
      testSifilis: m?.testSifilis || '',
      testHbsAg: m?.testHbsAg || '',
      ancTerpadu: m?.ancTerpadu || '',
      zscore: m?.zScoreBMIPregnant || '',
      stunting: m?.stuntingStatus || '',
      resiko: m?.resiko || '',
      nomorJaminan: p.nomorJaminan || '',
      catatan: m?.counselingNotes || ''
    });
  });

  styleSheet(sheet);
};

// ==========================================
// STYLE SHEET HELPER
// ==========================================
const styleSheet = (sheet) => {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }
  };
  headerRow.alignment = { 
    vertical: 'middle', 
    horizontal: 'center',
    wrapText: true 
  };
  headerRow.height = 30;

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
      
      if (rowNumber > 1) {
        cell.alignment = { 
          vertical: 'middle',
          wrapText: true
        };
      }
    });
  });

  sheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1 }
  ];
};

// ==========================================
// EXPORT KELURAHAN
// ==========================================
const exportKelurahan = async (req, res, next) => {
  return exportCommon(req, res, next, 'kelurahan');
};

// ==========================================
// EXPORT PUSKESMAS
// ==========================================
const exportPuskesmas = async (req, res, next) => {
  return exportCommon(req, res, next, 'puskesmas');
};

// ==========================================
// 8. GET STUNTING STATISTICS (PIE CHART)
// ==========================================
const getStuntingStatistics = async (req, res, next) => {
  try {
    const { patientType, month, year } = req.query;

    // Build where clause untuk filter patient type
    const patientWhere = patientType ? { patientType } : {};

    // Build date filter untuk checkup session
    let dateFilter = {};
    if (month && year) {
      const mm = String(month).padStart(2, '0');
      const start = `${year}-${mm}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;
      dateFilter.session_date = { [Op.between]: [start, end] };
    } else if (year) {
      dateFilter.session_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }

    // Get all measurements with patient info
    const measurements = await Measurement.findAll({
      include: [
        {
          model: CheckupSession,
          as: 'checkup_session',
          where: dateFilter,
          required: true,
          include: [
            {
              model: Pasien,
              as: 'patient',
              where: patientWhere,
              required: true
            }
          ]
        }
      ]
    });

    // Initialize counters
    const stats = {
      balita: {
        stunting: 0,
        tidakStunting: 0,
        total: 0
      },
      ibu_hamil: {
        stunting: 0,
        tidakStunting: 0,
        total: 0
      },
      total: {
        stunting: 0,
        tidakStunting: 0,
        total: 0
      }
    };

    // Process measurements
    measurements.forEach(m => {
      const patType = m.checkup_session?.patient?.patientType;
      const stuntingStatus = m.stuntingStatus?.toLowerCase() || '';

      // Check if stunting
      const isStunting = 
        stuntingStatus.includes('stunted') || 
        stuntingStatus.includes('pendek') ||
        stuntingStatus.includes('kek') ||
        stuntingStatus.includes('risiko');

      if (patType === 'balita') {
        stats.balita.total++;
        if (isStunting) {
          stats.balita.stunting++;
        } else if (stuntingStatus && stuntingStatus !== 'belum dapat ditentukan') {
          stats.balita.tidakStunting++;
        }
      } else if (patType === 'ibu_hamil') {
        stats.ibu_hamil.total++;
        if (isStunting) {
          stats.ibu_hamil.stunting++;
        } else if (stuntingStatus && stuntingStatus !== 'belum dapat ditentukan') {
          stats.ibu_hamil.tidakStunting++;
        }
      }
    });

    // Calculate totals
    stats.total.stunting = stats.balita.stunting + stats.ibu_hamil.stunting;
    stats.total.tidakStunting = stats.balita.tidakStunting + stats.ibu_hamil.tidakStunting;
    stats.total.total = stats.balita.total + stats.ibu_hamil.total;

    res.status(200).json({
      success: true,
      message: 'Statistik stunting berhasil diambil',
      data: stats
    });
  } catch (err) {
    console.error('[getStuntingStatistics Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil statistik stunting. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// 9. GET STUNTING TRENDS (BAR CHART - 4 MONTHS)
// ==========================================
const getStuntingTrends = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Bulan dan tahun harus diisi untuk mendapatkan data trend.'
      });
    }

    const selectedMonth = parseInt(month);
    const selectedYear = parseInt(year);

    // Generate 4 months data (current + 3 previous months)
    const monthsData = [];
    
    for (let i = 3; i >= 0; i--) {
      let targetMonth = selectedMonth - i;
      let targetYear = selectedYear;

      // Handle year change
      if (targetMonth <= 0) {
        targetMonth = 12 + targetMonth;
        targetYear = selectedYear - 1;
      }

      const monthStr = String(targetMonth).padStart(2, '0');
      const startDate = `${targetYear}-${monthStr}-01`;
      const endDay = new Date(targetYear, targetMonth, 0).getDate();
      const endDate = `${targetYear}-${monthStr}-${String(endDay).padStart(2, '0')}`;

      // Get measurements for this month
      const measurements = await Measurement.findAll({
        include: [
          {
            model: CheckupSession,
            as: 'checkup_session',
            where: {
              session_date: { [Op.between]: [startDate, endDate] }
            },
            required: true,
            include: [
              {
                model: Pasien,
                as: 'patient',
                required: true
              }
            ]
          }
        ]
      });

      // Count statistics
      const monthStats = {
        balitaStunting: 0,
        balitaTidakStunting: 0,
        ibuHamilStunting: 0,
        ibuHamilTidakStunting: 0
      };

      measurements.forEach(m => {
        const patType = m.checkup_session?.patient?.patientType;
        const stuntingStatus = m.stuntingStatus?.toLowerCase() || '';

        const isStunting = 
          stuntingStatus.includes('stunted') || 
          stuntingStatus.includes('pendek') ||
          stuntingStatus.includes('kek') ||
          stuntingStatus.includes('risiko');

        if (patType === 'balita') {
          if (isStunting) {
            monthStats.balitaStunting++;
          } else if (stuntingStatus && stuntingStatus !== 'belum dapat ditentukan') {
            monthStats.balitaTidakStunting++;
          }
        } else if (patType === 'ibu_hamil') {
          if (isStunting) {
            monthStats.ibuHamilStunting++;
          } else if (stuntingStatus && stuntingStatus !== 'belum dapat ditentukan') {
            monthStats.ibuHamilTidakStunting++;
          }
        }
      });

      // Month names in Indonesian
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      monthsData.push({
        month: targetMonth,
        year: targetYear,
        name: `${monthNames[targetMonth - 1]} ${targetYear}`,
        balitaStunting: monthStats.balitaStunting,
        balitaTidakStunting: monthStats.balitaTidakStunting,
        ibuHamilStunting: monthStats.ibuHamilStunting,
        ibuHamilTidakStunting: monthStats.ibuHamilTidakStunting,
        totalStunting: monthStats.balitaStunting + monthStats.ibuHamilStunting,
        totalTidakStunting: monthStats.balitaTidakStunting + monthStats.ibuHamilTidakStunting
      });
    }

    res.status(200).json({
      success: true,
      message: 'Data trend stunting berhasil diambil',
      data: monthsData
    });
  } catch (err) {
    console.error('[getStuntingTrends Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil data trend stunting. Silakan coba lagi.',
      error: err.message
    });
  }
};

// ==========================================
// EXPORT MODULES
// ==========================================
module.exports = {
  validateMeasurementInput,
  upsertMeasurement,
  getMeasurementBySession,
  getMeasurementForEdit,
  getAllMeasurements,
  getMeasurementById,
  exportKelurahan,
  exportPuskesmas,
  getStuntingStatistics,
  getStuntingTrends
};