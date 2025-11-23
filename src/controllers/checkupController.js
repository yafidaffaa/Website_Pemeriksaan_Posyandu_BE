const { CheckupSession, Measurement, Pasien, User } = require('../models');
const { Op } = require('sequelize');

const requiredFieldsByPatientType = (patientType) => {
  if (patientType === 'balita') {
    return [
      'ageMonths',
      'weightKg',
      'heightCm',
      'headCircCm',
      'lilaCm',
      'asi',
      'vitaminA',
      'statusGizi',
      'stuntingStatus'
    ];
  }
  
  return [
    'ageMonthsPregnant',
    'weightKgPregnant',
    'heightCmPregnant',
    'lilaCmPregnant',
    'tekananDarah',
    'proteinUrine',
    'reduksiUrine',
    'testHiv',
    'testSifilis',
    'testHbsAg',
    'gds',
    'ancTerpadu',
    'HB',
    'zScoreBMIPregnant',
    'stuntingStatus',
    'resiko'
  ];
};

const checkMeasurementComplete = (measurements = [], patientType) => {
  const required = requiredFieldsByPatientType(patientType);

  if (!measurements || measurements.length === 0) {
    console.log('❌ Tidak ada measurements');
    return false;
  }

  const measurement = measurements[0];

  console.log('\n🔍 Checking measurement completeness:');
  console.log('   Patient Type:', patientType);
  console.log('   Required Fields:', required);

  const missingFields = [];
  const presentFields = [];

  required.forEach(field => {
    const value = measurement[field];
    const isPresent = value !== null && value !== undefined && value !== '';
    
    if (isPresent) {
      presentFields.push(field);
      console.log(`   ✅ ${field}: ${value}`);
    } else {
      missingFields.push(field);
      console.log(`   ❌ ${field}: kosong`);
    }
  });

  const isComplete = missingFields.length === 0;

  console.log('\n📊 Summary:');
  console.log(`   Total Required: ${required.length}`);
  console.log(`   Present: ${presentFields.length}`);
  console.log(`   Missing: ${missingFields.length}`);
  if (missingFields.length > 0) {
    console.log(`   Missing Fields: ${missingFields.join(', ')}`);
  }
  console.log(`   Result: ${isComplete ? '✅ LENGKAP' : '❌ BELUM LENGKAP'}\n`);

  return isComplete;
};

const getCheckupQueue = async (req, res, next) => {
  try {
    let { month, year, patientType = 'ibu_hamil', page = 1, limit = 50 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 50;
    const offset = (page - 1) * limit;

    const whereDate = {};
    if (month && year) {
      const mm = String(month).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;
      whereDate.session_date = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      whereDate.session_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }

    const { count, rows } = await CheckupSession.findAndCountAll({
      where: whereDate,
      include: [
        {
          model: Pasien,
          as: 'patient',
          where: patientType ? { patientType } : {},
          required: true
        },
        {
          model: Measurement,
          as: 'measurements',
          required: false
        },
        {
          model: User,
          as: 'created_by',
          attributes: ['id', 'username', 'nama_lengkap']
        }
      ],
      limit,
      offset,
      order: [['session_date', 'DESC'], ['created_at', 'DESC']]
    });

    const data = rows.map((session, idx) => {
      const patient = session.patient;
      
      const isComplete = checkMeasurementComplete(session.measurements, patient.patientType);

      let patientSummary = {
        id: patient.id,
        patientType: patient.patientType,
        name: patient.name,
        gender: patient.gender,
        rt: patient.rt || null
      };

      if (patient.patientType === 'balita') {
        patientSummary.motherName = patient.motherName || null;
      } else if (patient.patientType === 'ibu_hamil') {
        patientSummary.ageInYears = patient.ageInYears || null;
      }

      return {
        no: offset + idx + 1,
        id: session.id,
        sessionDate: session.session_date,
        completed: session.completed,
        isDataComplete: isComplete, 
        patient: patientSummary,
        measurementCount: session.measurements ? session.measurements.length : 0,
        createdBy: session.created_by || null
      };
    });

    res.status(200).json({
      success: true,
      message: 'Checkup queue retrieved successfully',
      pagination: {
        total: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        limit
      },
      data
    });
  } catch (err) {
    console.error('[getCheckupQueue Error]', err);
    next(err);
  }
};

const markCheckupCompleted = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await CheckupSession.findByPk(id, {
      include: [
        { model: Measurement, as: 'measurements' },
        { model: Pasien, as: 'patient' }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkup session tidak ditemukan'
      });
    }

    const isComplete = checkMeasurementComplete(session.measurements, session.patient.patientType);
    if (!isComplete) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menandai selesai: data pemeriksaan belum lengkap',
        suggestion: 'Pastikan semua field wajib sudah diisi',
        details: {
          patientType: session.patient.patientType,
          measurementCount: session.measurements ? session.measurements.length : 0,
          requiredFields: requiredFieldsByPatientType(session.patient.patientType)
        }
      });
    }

    session.completed = true;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Checkup berhasil ditandai sebagai selesai',
      data: {
        id: session.id,
        sessionDate: session.session_date,
        completed: session.completed,
        patientId: session.patient_id,
        patientName: session.patient.name
      }
    });
  } catch (err) {
    console.error('[markCheckupCompleted Error]', err);
    next(err);
  }
};

const deleteCheckupSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await CheckupSession.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkup session tidak ditemukan'
      });
    }

    await Measurement.destroy({ where: { checkup_session_id: id } });

    await session.destroy();

    res.status(200).json({
      success: true,
      message: 'Checkup session berhasil dihapus',
      data: {
        deleted_id: id,
        sessionDate: session.session_date
      }
    });
  } catch (err) {
    console.error('[deleteCheckupSession Error]', err);
    next(err);
  }
};

module.exports = {
  getCheckupQueue,
  markCheckupCompleted,
  deleteCheckupSession
};