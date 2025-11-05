const { CheckupSession, Measurement, Pasien, User } = require('../models');
const { Op } = require('sequelize');

// ==========================================
// HELPER: Tentukan required fields per patientType
// ==========================================
const requiredFieldsByPatientType = (patientType) => {
  if (patientType === 'balita') {
    return ['weightKg', 'heightCm', 'stuntingStatus'];
  }
  // ibu_hamil
  return ['weightKgPregnant', 'heightCmPregnant', 'lilaCm'];
};

// ==========================================
// HELPER: Cek apakah measurements lengkap
// ==========================================
const checkMeasurementComplete = (measurements = [], patientType) => {
  const required = requiredFieldsByPatientType(patientType);

  if (!measurements || measurements.length === 0) return false;

  return measurements.some(m => {
    return required.every(field => m[field] !== null && m[field] !== undefined);
  });
};

// ==========================================
// GET CHECKUP QUEUE
// ==========================================
const getCheckupQueue = async (req, res, next) => {
  try {
    let { month, year, patientType = 'ibu_hamil', page = 1, limit = 50 } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 50;
    const offset = (page - 1) * limit;

    // Build date filter based on session_date
    const whereDate = {};
    if (month && year) {
      const mm = String(month).padStart(2, '0');
      const startDate = `${year}-${mm}-01`;
      // last day of month
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${mm}-${String(endDay).padStart(2, '0')}`;
      whereDate.session_date = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      whereDate.session_date = { [Op.between]: [`${year}-01-01`, `${year}-12-31`] };
    }

    // Query CheckupSession with patient and measurements included
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
      }

      return {
        no: offset + idx + 1,
        id: session.id,
        sessionDate: session.session_date,
        completed: session.completed,
        isDataComplete: isComplete, // false -> warna merah; true -> hijau
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
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// MARK CHECKUP AS COMPLETED
// ==========================================
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
        message: 'Checkup session not found'
      });
    }

    // Cek kelengkapan measurements
    const isComplete = checkMeasurementComplete(session.measurements, session.patient.patientType);
    if (!isComplete) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark complete: measurements not complete',
        details: {
          patientType: session.patient.patientType,
          measurementCount: session.measurements ? session.measurements.length : 0,
          requiredFields: requiredFieldsByPatientType(session.patient.patientType)
        }
      });
    }

    // Mark as completed
    session.completed = true;
    await session.save();

    res.status(200).json({
      success: true,
      message: 'Checkup marked as completed successfully',
      data: {
        id: session.id,
        sessionDate: session.session_date,
        completed: session.completed,
        patientId: session.patient_id,
        patientName: session.patient.name
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

// ==========================================
// DELETE CHECKUP SESSION
// ==========================================
const deleteCheckupSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await CheckupSession.findByPk(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Checkup session not found'
      });
    }

    // Hapus semua measurement terkait dulu
    await Measurement.destroy({ where: { checkup_session_id: id } });

    // Hapus session
    await session.destroy();

    res.status(200).json({
      success: true,
      message: 'Checkup session deleted successfully',
      data: {
        deleted_id: id,
        sessionDate: session.session_date
      }
    });
  } catch (err) {
    next(err);  // Pass ke error handler
  }
};

module.exports = {
  getCheckupQueue,
  markCheckupCompleted,
  deleteCheckupSession
};