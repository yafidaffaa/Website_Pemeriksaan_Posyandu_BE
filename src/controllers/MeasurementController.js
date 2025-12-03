const { Measurement, CheckupSession, Pasien, User } = require('../models');
const { calculateChildZScore, calculatePregnantZScore, validateMeasurementData } = require('../utils/zscore');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

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

const filterAllowed = (input, role, patientType) => {
  const allowed = rolePermissions[role]?.[patientType] || [];
  const out = {};
  for (const key of allowed) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
};

const calcBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  if (h <= 0) return null;
  return +(weightKg / (h * h)).toFixed(2);
};

const calculatePerkiraanPersalinan = (patient) => {
  const hpm = patient.hpm || patient.hpm_date || patient.tgl_hpht || null;
  if (!hpm) return null;
  const d = new Date(hpm);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
};

const calculateAndSaveZScores = async (measurement, checkup) => {
  const patientType = checkup.patient.patientType;
  
  try {
    if (patientType === 'balita') {
      const weight = parseFloat(measurement.weightKg);
      const height = parseFloat(measurement.heightCm);
      const ageMonths = parseFloat(measurement.ageMonths);

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
          measurement.statusGizi = zResult.classification;
          measurement.zScoreBMIU = zResult.bmiForAgeZ;
          
          measurement.stuntingStatus = zResult.stuntingStatus;
          
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
      measurement.zScoreBMIPregnant = zPreg.zScore;
      measurement.stuntingStatus = zPreg.nutritionStatus;
      measurement.statusGizi = zPreg.classification;
      
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

const validateMeasurementInput = (data, patientType) => {
  const errors = [];

  if (patientType === 'balita') {
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

    if (patientType === 'ibu_hamil') {
    if (data.resiko !== undefined && data.resiko !== null && data.resiko !== '') {
      const resiko = String(data.resiko);
      if (resiko.length > 50) {
        errors.push('Resiko tidak boleh lebih dari 50 karakter');
      }
    }
  }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

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

    const validation = validateMeasurementInput(allowedData, patientType);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Data tidak valid',
        errors: validation.errors,
        suggestion: 'Periksa kembali data yang Anda masukkan. ' + validation.errors.join('. ')
      });
    }

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

    await calculateAndSaveZScores(measurement, measurement.checkup_session);
    await measurement.save();
    await measurement.reload();

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
  return res.status(200).json({
    success: false,
    message: `Tidak ada data pemeriksaan untuk periode ${month}/${year}. Pastikan sudah ada data yang diinput.`
  });
}

const hasValidData = checkups.some(c => 
  c.measurements && c.measurements.length > 0 && c.measurements[0]
);

if (!hasValidData) {
  return res.status(200).json({
    success: false,
    message: `Tidak ada data pemeriksaan yang lengkap untuk periode ${month}/${year}. Pasien sudah terdaftar dalam antrian tetapi belum ada data pengukuran yang diinput.`
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

const createBalitaSheet = (workbook, checkups, scope) => {
  const sheet = workbook.addWorksheet('Register Balita');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  sheet.mergeCells('A1:V1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DATA PENIMBANGAN POSYANDU BALITA';
  titleCell.font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }
  };
  
  const row2 = sheet.getRow(2);
  row2.height = 25;
  
  sheet.mergeCells('A2:H2');
  const posyanduCell = sheet.getCell('A2');
  posyanduCell.value = 'Posyandu: Bunga Lily';
  posyanduCell.alignment = { horizontal: 'left', vertical: 'middle' };
  posyanduCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('I2:P2');
  const dusunCell = sheet.getCell('I2');
  dusunCell.value = 'Dusun: Gendeng';
  dusunCell.alignment = { horizontal: 'left', vertical: 'middle' };
  dusunCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('Q2:V2');
  const tanggalCell = sheet.getCell('Q2');
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  tanggalCell.value = `Tanggal: ${day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  tanggalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  tanggalCell.font = { bold: true, size: 11 };

  const row3 = sheet.getRow(3);
  const row4 = sheet.getRow(4);
  const row5 = sheet.getRow(5);
  row3.height = 25;
  row4.height = 25;
  row5.height = 25;
  
  sheet.mergeCells('A3:A5');
  sheet.getCell('A3').value = 'No';
  
  sheet.mergeCells('B3:B5');
  sheet.getCell('B3').value = 'Nama\nAnak';
  
  sheet.mergeCells('C3:C5');
  sheet.getCell('C3').value = 'Tanggal\nLahir';
  
  sheet.mergeCells('D3:D5');
  sheet.getCell('D3').value = 'Nama\nOrtu';
  
  sheet.mergeCells('E3:E5');
  sheet.getCell('E3').value = 'Usia\n(Minggu)';
  
  sheet.mergeCells('F3:F5');
  sheet.getCell('F3').value = 'RT';
  
  sheet.mergeCells('G3:N3');
  sheet.getCell('G3').value = 'BERAT (Kg)';
  sheet.getCell('G3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('G3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.mergeCells('G4:H4');
  sheet.getCell('G4').value = '0-5 BLN';
  
  sheet.mergeCells('I4:J4');
  sheet.getCell('I4').value = '6-11 BLN';
  
  sheet.mergeCells('K4:L4');
  sheet.getCell('K4').value = '12-23 BLN';
  
  sheet.mergeCells('M4:N4');
  sheet.getCell('M4').value = '24-59 BLN';
  
  sheet.getCell('G5').value = 'L';
  sheet.getCell('H5').value = 'P';
  sheet.getCell('I5').value = 'L';
  sheet.getCell('J5').value = 'P';
  sheet.getCell('K5').value = 'L';
  sheet.getCell('L5').value = 'P';
  sheet.getCell('M5').value = 'L';
  sheet.getCell('N5').value = 'P';
  
  sheet.mergeCells('O3:O5');
  sheet.getCell('O3').value = 'Status\nGizi';
  
  sheet.mergeCells('P3:P5');
  sheet.getCell('P3').value = 'TB/PB\n(Cm)';
  
  sheet.mergeCells('Q3:Q5');
  sheet.getCell('Q3').value = 'Lingkar\nKepala\n(Cm)';
  
  sheet.mergeCells('R3:R5');
  sheet.getCell('R3').value = 'LILA\n(Cm)';
  
  sheet.mergeCells('S3:S5');
  sheet.getCell('S3').value = 'ASI\nEksklusif';
  
  sheet.mergeCells('T3:U3');
  sheet.getCell('T3').value = 'VITAMIN A';
  sheet.getCell('T3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('T3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.mergeCells('T4:T5');
  sheet.getCell('T4').value = 'Biru';
  
  sheet.mergeCells('U4:U5');
  sheet.getCell('U4').value = 'Merah';
  
  sheet.mergeCells('V3:V5');
  sheet.getCell('V3').value = 'Keterangan';

  [3, 4, 5].forEach(rowNum => {
    const row = sheet.getRow(rowNum);
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1D5DB' }
      };
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true 
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  sheet.columns = [
    { width: 5 },   
    { width: 20 },  
    { width: 12 },  
    { width: 20 },  
    { width: 9 },  
    { width: 6 },   
    { width: 6 },   
    { width: 6 },   
    { width: 6 },   
    { width: 6 },   
    { width: 6 },   
    { width: 6 },   
    { width: 6 },  
    { width: 6 },  
    { width: 15 },  
    { width: 8 },   
    { width: 10 },  
    { width: 8 },  
    { width: 10 }, 
    { width: 8 },  
    { width: 8 },   
    { width: 30 }   
  ];

  checkups.forEach((c, i) => {
    const m = c.measurements[0];
    const p = c.patient;

    let umurMinggu = p.ageInWeeks || null;
    let umurBulan = null;
    
    if (!umurMinggu && p.birthDate) {
      const sessionDate = new Date(c.session_date);
      const birth = new Date(p.birthDate);
      const diffMs = sessionDate - birth;
      umurMinggu = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    }
    
    if (p.birthDate) {
      const sessionDate = new Date(c.session_date);
      const birth = new Date(p.birthDate);
      const diffMs = sessionDate - birth;
      umurBulan = m?.ageMonths || Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
    }

    let beratKolom = ['', '', '', '', '', '', '', ''];
    if (m?.weightKg && umurBulan !== null) {
      const gender = p.gender;
      let kolomIndex = -1;
      
      if (umurBulan >= 0 && umurBulan <= 5) {
        kolomIndex = gender === 'L' ? 0 : 1; 
      } else if (umurBulan >= 6 && umurBulan <= 11) {
        kolomIndex = gender === 'L' ? 2 : 3; 
      } else if (umurBulan >= 12 && umurBulan <= 23) {
        kolomIndex = gender === 'L' ? 4 : 5; 
      } else if (umurBulan >= 24 && umurBulan <= 59) {
        kolomIndex = gender === 'L' ? 6 : 7; 
      }
      
      if (kolomIndex >= 0) {
        beratKolom[kolomIndex] = m.weightKg;
      }
    }

    const rowData = [
      i + 1,                                    
      p.name || '',                              
      formatDate(p.birthDate),                         
      p.motherName || '',                        
      umurMinggu || '',                          
      p.rt || '',                                
      beratKolom[0],                             
      beratKolom[1],                            
      beratKolom[2],                            
      beratKolom[3],                             
      beratKolom[4],                             
      beratKolom[5],                              
      beratKolom[6],                              
      beratKolom[7],                              
      m?.statusGizi || '',                       
      m?.heightCm || '',                          
      m?.headCircCm || '',                        
      m?.lilaCm || '',                           
      m?.asi || '',                               
      m?.vitaminA?.includes('Biru') || m?.vitaminA?.includes('biru') ? '√' : '', 
      m?.vitaminA?.includes('Merah') || m?.vitaminA?.includes('merah') ? '√' : '',
      m?.counselingNotes || ''                    
    ];
    const addedRow = sheet.addRow(rowData);

    const keteranganText = m?.counselingNotes || '';
    if (keteranganText && keteranganText.length > 0) {
    const estimatedLines = Math.ceil(keteranganText.length / 30);
    const minHeight = 30;
    const calculatedHeight = Math.max(minHeight, estimatedLines * 15);
    addedRow.height = calculatedHeight;
  }
  });

  styleBalitaSheet(sheet);
};

const styleBalitaSheet = (sheet) => {
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      if (rowNumber > 5) {
        cell.alignment = { 
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      }
    });
    
    if (rowNumber > 5 && !row.height) {
      row.height = 30;
    }
  });

  sheet.views = [
    { state: 'frozen', xSplit: 2, ySplit: 5 }
  ];

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    },
    horizontalCentered: true,
    printTitlesRow: '1:5' 
  };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber === 1) {
        cell.font = { ...cell.font, size: 14 };
      } else if (rowNumber === 2) {
        cell.font = { ...cell.font, size: 9 };
      } else if (rowNumber >= 3 && rowNumber <= 5) {
        cell.font = { ...cell.font, size: 9 };
      } else {
        cell.font = { size: 9 };
      }
    });
  });
};

const createIbuHamilSheet = (workbook, checkups, scope) => {
  const sheet = workbook.addWorksheet('Register Ibu Hamil');

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  sheet.mergeCells('A1:AC1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'REGISTER IBU HAMIL UNTUK MOTIVATOR/KADER';
  titleCell.font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }
  };

  const row2 = sheet.getRow(2);
  row2.height = 25;
  
  sheet.mergeCells('A2:G2');
  const posyanduCell = sheet.getCell('A2');
  posyanduCell.value = 'Posyandu: Bunga Lily';
  posyanduCell.alignment = { horizontal: 'left', vertical: 'middle' };
  posyanduCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('H2:N2');
  const dusunCell = sheet.getCell('H2');
  dusunCell.value = 'Dusun: Gendeng';
  dusunCell.alignment = { horizontal: 'left', vertical: 'middle' };
  dusunCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('O2:U2');
  const bulanCell = sheet.getCell('O2');
  const currentDate = new Date();
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  bulanCell.value = `Bulan: ${monthNames[currentDate.getMonth()]}`;
  bulanCell.alignment = { horizontal: 'left', vertical: 'middle' };
  bulanCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('V2:AC2');
  const tahunCell = sheet.getCell('V2');
  tahunCell.value = `Tahun: ${currentDate.getFullYear()}`;
  tahunCell.alignment = { horizontal: 'right', vertical: 'middle' };
  tahunCell.font = { bold: true, size: 11 };

  const row3 = sheet.getRow(3);
  const row4 = sheet.getRow(4);
  row3.height = 30;
  row4.height = 30;
  
  sheet.mergeCells('A3:A4');
  sheet.getCell('A3').value = 'No';
  
  sheet.mergeCells('B3:B4');
  sheet.getCell('B3').value = 'NIK';
  
  sheet.getCell('C3').value = 'Nama Ibu';
  sheet.getCell('C4').value = 'Nama Suami';
  
  sheet.mergeCells('D3:D4');
  sheet.getCell('D3').value = 'Umur\n(Thn)';
  
  sheet.mergeCells('E3:E4');
  sheet.getCell('E3').value = 'Alamat\n(RT)';
  
  sheet.mergeCells('F3:H3');
  sheet.getCell('F3').value = 'Paritas';
  sheet.getCell('F3').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sheet.getCell('F3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.getCell('F4').value = 'G';
  sheet.getCell('G4').value = 'P';
  sheet.getCell('H4').value = 'A';
  
  sheet.mergeCells('I3:I4');
  sheet.getCell('I3').value = 'Jarak dg\nPersalinan\nSebelumnya\n(Bulan)';
  
  sheet.mergeCells('J3:J4');
  sheet.getCell('J3').value = 'Usia\nKandungan\n(Bulan)';
  
  sheet.mergeCells('K3:K4');
  sheet.getCell('K3').value = 'HPM';
  
  sheet.mergeCells('L3:L4');
  sheet.getCell('L3').value = 'HPL';
  
  sheet.mergeCells('M3:P3');
  sheet.getCell('M3').value = 'Pemeriksaan';
  sheet.getCell('M3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('M3').font = { bold: true };
  sheet.getCell('M3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.getCell('M4').value = 'BB\n(Kg)';
  sheet.getCell('N4').value = 'TD\n(mmHg)';
  sheet.getCell('O4').value = 'TB\n(Cm)';
  sheet.getCell('P4').value = 'LILA\n(Cm)';
  
  sheet.mergeCells('Q3:X3');
  sheet.getCell('Q3').value = 'Hasil Laborat';
  sheet.getCell('Q3').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getCell('Q3').font = { bold: true };
  sheet.getCell('Q3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  
  sheet.getCell('Q4').value = 'HB';
  sheet.getCell('R4').value = 'Golongan\nDarah';
  sheet.getCell('S4').value = 'Protein\nUrine';
  sheet.getCell('T4').value = 'Reduksi\nUrine';
  sheet.getCell('U4').value = 'HIV';
  sheet.getCell('V4').value = 'Sifilis';
  sheet.getCell('W4').value = 'HbsAg';
  sheet.getCell('X4').value = 'GDS';
  
  sheet.mergeCells('Y3:Y4');
  sheet.getCell('Y3').value = 'ANC\nTerpadu';
  
  sheet.mergeCells('Z3:Z4');
  sheet.getCell('Z3').value = 'Resiko\nLain';
  
  sheet.mergeCells('AA3:AA4');
  sheet.getCell('AA3').value = 'Jaminan\n(No Jaminan)';
  
  sheet.mergeCells('AB3:AB4');
  sheet.getCell('AB3').value = 'No HP/WA\nIbu';
  
  sheet.mergeCells('AC3:AC4');
  sheet.getCell('AC3').value = 'TTD &\nCap Kader';

  [3, 4].forEach(rowNum => {
    const row = sheet.getRow(rowNum);
    row.eachCell((cell) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1D5DB' }
      };
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true 
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
  });

  sheet.columns = [
    { width: 5 },   
    { width: 18 },
    { width: 25 },  
    { width: 8 }, 
    { width: 10 }, 
    { width: 5 },  
    { width: 5 },   
    { width: 5 },   
    { width: 12 },  
    { width: 10 },  
    { width: 12 },  
    { width: 12 }, 
    { width: 8 },   
    { width: 10 },  
    { width: 8 },  
    { width: 8 },   
    { width: 8 },  
    { width: 10 }, 
    { width: 10 },  
    { width: 10 }, 
    { width: 8 },  
    { width: 8 },  
    { width: 8 },  
    { width: 8 },  
    { width: 12 }, 
    { width: 20 },  
    { width: 30 },  
    { width: 15 },  
    { width: 15 }   
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

    let hpl = p.hpl || '';
    if (!hpl && p.hpm) {
      const hpmDate = new Date(p.hpm);
      hpmDate.setDate(hpmDate.getDate() + 280);
      hpl = hpmDate.toISOString().split('T')[0];
    }

    const dataRow = sheet.addRow([
      i + 1,                                 
      p.nik || '',                             
      p.name || '',                          
      p.ageInYears || umurTahun || '',         
      p.rt || '',                             
      p.gravida || '',                         
      p.partus || '',                          
      p.abortus || '',                         
      p.jarakPersalinanSebelumnya || '',       
      m?.ageMonthsPregnant || '',              
      formatDate(p.hpm || p.hpm_date) || '',                
      formatDate(hpl),                                     
      m?.weightKgPregnant || '',               
      m?.tekananDarah || '',                   
      m?.heightCmPregnant || '',               
      m?.lilaCmPregnant || '',                 
      m?.HB || '',                            
      p.golonganDarah || '',                   
      m?.proteinUrine || '',                   
      m?.reduksiUrine || '',                    
      m?.testHiv || '',                         
      m?.testSifilis || '',                    
      m?.testHbsAg || '',                      
      m?.gds || '',                            
      m?.ancTerpadu || '',                      
      m?.resiko || '',                         
      p.nomorJaminan || '',                    
      p.noTelp || '',                          
      ''                                        
    ]);

    const suamiRow = sheet.addRow([
      '',                                       
      '',                                      
      p.namaSuami || '',                       
      '',                                       
    ]);

    const currentRow = dataRow.number;
    
    sheet.mergeCells(currentRow, 1, currentRow + 1, 1);
    
    sheet.mergeCells(currentRow, 2, currentRow + 1, 2);
        
    for (let col = 4; col <= 29; col++) {
      sheet.mergeCells(currentRow, col, currentRow + 1, col);
    }

    const resikoText = m?.resiko || '';
    if (resikoText && resikoText.length > 20) {
    const estimatedLines = Math.ceil(resikoText.length / 20);
    const minHeight = 35;
    const calculatedHeight = Math.max(minHeight, estimatedLines * 15);
    dataRow.height = calculatedHeight;
    suamiRow.height = calculatedHeight;
  }
  });

  styleRegisterSheet(sheet);
};

const styleRegisterSheet = (sheet) => {
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      if (rowNumber > 4) {
        cell.alignment = { 
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
      }
    });
    
    if (rowNumber > 4) {
      row.height = 35;
    }
  });

  sheet.views = [
    { state: 'frozen', xSplit: 3, ySplit: 4 }
  ];

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    },
    horizontalCentered: true,
    printTitlesRow: '1:4' 
  };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber === 1) {
        cell.font = { ...cell.font, size: 14 };
      } else if (rowNumber === 2) {
        cell.font = { ...cell.font, size: 9 };
      } else if (rowNumber >= 3 && rowNumber <= 4) {
        cell.font = { ...cell.font, size: 9 };
      } else {
        cell.font = { size: 10 };
      }
    });
  });
};

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

const createPenerimaManfaatSheet = (workbook, checkups) => {
  const sheet = workbook.addWorksheet('Penerima Manfaat Ibu Hamil');

  sheet.mergeCells('A1:I1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DATA PENERIMA MANFAAT IBU HAMIL';
  titleCell.font = { bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }
  };
  
  const row2 = sheet.getRow(2);
  row2.height = 25;
  
  sheet.mergeCells('A2:C2');
  const posyanduCell = sheet.getCell('A2');
  posyanduCell.value = 'Posyandu: Bunga Lily';
  posyanduCell.alignment = { horizontal: 'left', vertical: 'middle' };
  posyanduCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('D2:F2');
  const dusunCell = sheet.getCell('D2');
  dusunCell.value = 'Dusun: Gendeng';
  dusunCell.alignment = { horizontal: 'left', vertical: 'middle' };
  dusunCell.font = { bold: true, size: 11 };
  
  sheet.mergeCells('G2:I2');
  const tanggalCell = sheet.getCell('G2');
  const currentDate = new Date();
  const day = String(currentDate.getDate()).padStart(2, '0');
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  tanggalCell.value = `Tanggal: ${day} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  tanggalCell.alignment = { horizontal: 'right', vertical: 'middle' };
  tanggalCell.font = { bold: true, size: 11 };

  const row3 = sheet.getRow(3);
  row3.height = 30;
  
  const headers = [
    'No',
    'Nama',
    'Tanggal Lahir',
    'Nama Suami',
    'No KK',
    'NIK',
    'Tanggal Pemeriksaan Pertama',
    'HPL',
    'Resiko'
  ];
  
  headers.forEach((header, index) => {
    const cell = sheet.getCell(3, index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1D5DB' }
    };
    cell.alignment = { 
      vertical: 'middle', 
      horizontal: 'center',
      wrapText: true 
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    };
  });

  sheet.columns = [
    { width: 5 },  
    { width: 25 },  
    { width: 15 },  
    { width: 25 }, 
    { width: 20 }, 
    { width: 20 },  
    { width: 20 }, 
    { width: 15 }, 
    { width: 20 }   
  ];

  checkups.forEach((c, i) => {
    const m = c.measurements[0];
    const p = c.patient;

    let hpl = p.hpl || '';
    if (!hpl && p.hpm) {
      const hpmDate = new Date(p.hpm);
      hpmDate.setDate(hpmDate.getDate() + 280);
      hpl = hpmDate.toISOString().split('T')[0];
    }

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const rowData = [
      i + 1,                                        
      p.name || '',                                  
      formatDate(p.birthDate) || '',                
      p.namaSuami || '',                             
      p.noKK || '',                                 
      p.nik || '',                                   
      formatDate(p.tglPemeriksaanPertama) || '',     
      formatDate(hpl) || '',                         
      m?.resiko || ''                                
    ];

    const dataRow = sheet.addRow(rowData);
    
    dataRow.eachCell((cell) => {
      cell.alignment = { 
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    
    dataRow.height = 30;
  });

  stylePenerimaManfaatSheet(sheet);
};

const stylePenerimaManfaatSheet = (sheet) => {
  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    });
  });

  sheet.views = [
    { state: 'frozen', xSplit: 1, ySplit: 3 }
  ];

  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0, 
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    },
    horizontalCentered: true,
    printArea: undefined, 
    printTitlesRow: '1:3' 
  };

  sheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      if (rowNumber <= 2) {
        cell.font = { ...cell.font, size: 10 };
      } else if (rowNumber === 3) {
        cell.font = { ...cell.font, size: 9 };
      } else {
        cell.font = { size: 8 };
      }
    });
  });
};

const exportPenerimaManfaat = async (req, res, next) => {
  try {
    const { month, year } = req.query;

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
          where: { patientType: 'ibu_hamil' },
          required: true
        },
        { model: Measurement, as: 'measurements' }
      ],
      order: [['session_date', 'ASC']]
    });

    if (checkups.length === 0) {
  return res.status(200).json({
    success: false,
    message: `Tidak ada data ibu hamil untuk periode ${month}/${year}. Pastikan sudah ada data yang diinput.`
  });
}

const hasValidData = checkups.some(c => 
  c.measurements && c.measurements.length > 0
);

if (!hasValidData) {
  return res.status(200).json({
    success: false,
    message: `Data ibu hamil untuk periode ${month}/${year} belum memiliki pengukuran yang lengkap. Silakan lengkapi data pemeriksaan terlebih dahulu.`
  });
}

    const workbook = new ExcelJS.Workbook();
    createPenerimaManfaatSheet(workbook, checkups);

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Penerima_Manfaat_Ibu_Hamil_${month}_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (err) {
    console.error('[exportPenerimaManfaat Error]', err);
    next({
      statusCode: 500,
      message: 'Terjadi kesalahan saat melakukan export data. Silakan coba lagi atau hubungi administrator.',
      error: err.message
    });
  }
};

const exportKelurahan = async (req, res, next) => {
  return exportCommon(req, res, next, 'kelurahan');
};

const exportPuskesmas = async (req, res, next) => {
  return exportCommon(req, res, next, 'puskesmas');
};

const getStuntingStatistics = async (req, res, next) => {
  try {
    const { patientType, month, year } = req.query;

    const patientWhere = patientType ? { patientType } : {};

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

    measurements.forEach(m => {
      const patType = m.checkup_session?.patient?.patientType;
      const stuntingStatus = m.stuntingStatus?.toLowerCase() || '';

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

    const monthsData = [];
    
    for (let i = 3; i >= 0; i--) {
      let targetMonth = selectedMonth - i;
      let targetYear = selectedYear;

      if (targetMonth <= 0) {
        targetMonth = 12 + targetMonth;
        targetYear = selectedYear - 1;
      }

      const monthStr = String(targetMonth).padStart(2, '0');
      const startDate = `${targetYear}-${monthStr}-01`;
      const endDay = new Date(targetYear, targetMonth, 0).getDate();
      const endDate = `${targetYear}-${monthStr}-${String(endDay).padStart(2, '0')}`;

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

module.exports = {
  validateMeasurementInput,
  upsertMeasurement,
  getMeasurementBySession,
  getMeasurementForEdit,
  getAllMeasurements,
  getMeasurementById,
  exportKelurahan,
  exportPuskesmas,
  exportPenerimaManfaat,
  getStuntingStatistics,
  getStuntingTrends
};