/**
 * ========== Z-SCORE HELPER UNTUK POSYANDU (FIXED) ==========
 * Menghitung:
 * - Z-score Balita (BB/U, TB/U, IMT/U) dengan referensi WHO per umur
 * - Z-score Ibu Hamil (berdasarkan IMT & LILA untuk deteksi risiko stunting)
 */

// ==========================================
// REFERENSI WHO UNTUK TINGGI BADAN (HEIGHT FOR AGE)
// Data simplified, dalam produksi gunakan tabel lengkap WHO
// ==========================================
const HEIGHT_FOR_AGE_REF = {
  male: [
    { month: 0, median: 49.9, sd: 1.9 },
    { month: 3, median: 60.8, sd: 2.2 },
    { month: 6, median: 67.6, sd: 2.4 },
    { month: 9, median: 72.3, sd: 2.5 },
    { month: 12, median: 75.7, sd: 2.6 },
    { month: 15, median: 78.7, sd: 2.7 },
    { month: 18, median: 81.2, sd: 2.8 },
    { month: 21, median: 83.5, sd: 2.9 },
    { month: 24, median: 85.6, sd: 3.0 },
    { month: 30, median: 89.5, sd: 3.2 },
    { month: 36, median: 92.9, sd: 3.4 },
    { month: 42, median: 96.2, sd: 3.5 },
    { month: 48, median: 99.3, sd: 3.7 },
    { month: 54, median: 102.3, sd: 3.8 },
    { month: 60, median: 105.2, sd: 4.0 }
  ],
  female: [
    { month: 0, median: 49.1, sd: 1.9 },
    { month: 3, median: 59.8, sd: 2.1 },
    { month: 6, median: 65.7, sd: 2.3 },
    { month: 9, median: 70.1, sd: 2.4 },
    { month: 12, median: 74.0, sd: 2.5 },
    { month: 15, median: 77.1, sd: 2.6 },
    { month: 18, median: 79.7, sd: 2.7 },
    { month: 21, median: 82.1, sd: 2.8 },
    { month: 24, median: 84.2, sd: 2.9 },
    { month: 30, median: 88.1, sd: 3.1 },
    { month: 36, median: 91.5, sd: 3.3 },
    { month: 42, median: 94.7, sd: 3.4 },
    { month: 48, median: 97.8, sd: 3.6 },
    { month: 54, median: 100.7, sd: 3.7 },
    { month: 60, median: 103.6, sd: 3.9 }
  ]
};

// ==========================================
// REFERENSI WHO UNTUK BMI (BMI FOR AGE)
// Data simplified, dalam produksi gunakan tabel lengkap WHO
// ==========================================
const BMI_FOR_AGE_REF = {
  male: [
    { month: 0, median: 13.4, sd: 1.3 },
    { month: 3, median: 16.3, sd: 1.5 },
    { month: 6, median: 17.2, sd: 1.5 },
    { month: 9, median: 17.3, sd: 1.4 },
    { month: 12, median: 16.9, sd: 1.3 },
    { month: 15, median: 16.5, sd: 1.3 },
    { month: 18, median: 16.2, sd: 1.2 },
    { month: 21, median: 15.9, sd: 1.2 },
    { month: 24, median: 15.7, sd: 1.2 },
    { month: 30, median: 15.4, sd: 1.2 },
    { month: 36, median: 15.3, sd: 1.2 },
    { month: 42, median: 15.2, sd: 1.2 },
    { month: 48, median: 15.2, sd: 1.3 },
    { month: 54, median: 15.2, sd: 1.3 },
    { month: 60, median: 15.3, sd: 1.4 }
  ],
  female: [
    { month: 0, median: 13.3, sd: 1.3 },
    { month: 3, median: 16.1, sd: 1.5 },
    { month: 6, median: 16.8, sd: 1.4 },
    { month: 9, median: 16.9, sd: 1.4 },
    { month: 12, median: 16.5, sd: 1.3 },
    { month: 15, median: 16.1, sd: 1.3 },
    { month: 18, median: 15.8, sd: 1.2 },
    { month: 21, median: 15.5, sd: 1.2 },
    { month: 24, median: 15.3, sd: 1.2 },
    { month: 30, median: 15.1, sd: 1.2 },
    { month: 36, median: 15.0, sd: 1.2 },
    { month: 42, median: 14.9, sd: 1.2 },
    { month: 48, median: 14.9, sd: 1.3 },
    { month: 54, median: 15.0, sd: 1.3 },
    { month: 60, median: 15.0, sd: 1.4 }
  ]
};

// ==========================================
// REFERENSI BMI & LILA IBU HAMIL (Standar Kemenkes RI)
// ==========================================
const PREGNANCY_BMI_REF = {
  underweight: 18.5,
  normal: 24.9,
  overweight: 29.9,
  obese: 30
};

// Standar LILA Ibu Hamil (Kemenkes RI)
const PREGNANCY_LILA_REF = {
  kek: 23.5, // LILA < 23.5 cm = KEK (Kurang Energi Kronis)
  normal: 23.5 // LILA >= 23.5 cm = Normal
};

function interpolateReference(refData, ageMonths) {
  if (ageMonths <= refData[0].month) {
    return refData[0];
  }
  
  if (ageMonths >= refData[refData.length - 1].month) {
    return refData[refData.length - 1];
  }
  
  for (let i = 0; i < refData.length - 1; i++) {
    const curr = refData[i];
    const next = refData[i + 1];
    
    if (ageMonths >= curr.month && ageMonths <= next.month) {
      const ratio = (ageMonths - curr.month) / (next.month - curr.month);
      return {
        month: ageMonths,
        median: curr.median + ratio * (next.median - curr.median),
        sd: curr.sd + ratio * (next.sd - curr.sd)
      };
    }
  }
  
  return refData[refData.length - 1];
}

function calculateChildZScore({ ageMonths, weight, height, gender }) {
  try {
    if (!weight || !height || weight <= 0 || height <= 0) {
      return {
        bmi: null,
        bmiForAgeZ: null,
        heightForAgeZ: null,
        classification: 'Data tidak lengkap',
        stuntingStatus: 'Belum dapat ditentukan',
        error: 'Berat badan dan tinggi badan harus diisi dengan benar'
      };
    }

    if (!gender) {
      return {
        bmi: null,
        bmiForAgeZ: null,
        heightForAgeZ: null,
        classification: 'Data tidak lengkap',
        stuntingStatus: 'Belum dapat ditentukan',
        error: 'Jenis kelamin harus diisi'
      };
    }

    if (!ageMonths || ageMonths < 0 || ageMonths > 60) {
      return {
        bmi: null,
        bmiForAgeZ: null,
        heightForAgeZ: null,
        classification: 'Data tidak lengkap',
        stuntingStatus: 'Belum dapat ditentukan',
        error: 'Umur harus antara 0-60 bulan'
      };
    }

    let genderKey = 'male';
    if (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'p' || gender.toLowerCase() === 'perempuan') {
      genderKey = 'female';
    }

    const bmi = weight / Math.pow(height / 100, 2);
    if (isNaN(bmi) || bmi <= 0) {
      return {
        bmi: null,
        bmiForAgeZ: null,
        heightForAgeZ: null,
        classification: 'Data tidak valid',
        stuntingStatus: 'Belum dapat ditentukan',
        error: 'Perhitungan BMI gagal, periksa kembali data tinggi dan berat badan'
      };
    }

    const bmiRef = interpolateReference(BMI_FOR_AGE_REF[genderKey], ageMonths);
    const heightRef = interpolateReference(HEIGHT_FOR_AGE_REF[genderKey], ageMonths);

    console.log('📊 Referensi WHO untuk umur', ageMonths, 'bulan:');
    console.log('   BMI Median:', bmiRef.median, 'SD:', bmiRef.sd);
    console.log('   Height Median:', heightRef.median, 'SD:', heightRef.sd);
    console.log('   BMI Aktual:', bmi);
    console.log('   Height Aktual:', height);

    const zBMI = (bmi - bmiRef.median) / bmiRef.sd;
    const zHeight = (height - heightRef.median) / heightRef.sd;

    console.log('   Z-Score BMI/U:', zBMI);
    console.log('   Z-Score TB/U:', zHeight);

    let classification = 'Normal';
    if (zBMI < -3) {
      classification = 'Gizi Buruk';
    } else if (zBMI >= -3 && zBMI < -2) {
      classification = 'Gizi Kurang';
    } else if (zBMI >= -2 && zBMI <= 2) {
      classification = 'Normal';
    } else if (zBMI > 2 && zBMI <= 3) {
      classification = 'Gizi Lebih';
    } else if (zBMI > 3) {
      classification = 'Obesitas';
    }

    let stuntingStatus = 'Normal';
    if (zHeight < -3) {
      stuntingStatus = 'Sangat Pendek (Severely Stunted)';
    } else if (zHeight >= -3 && zHeight < -2) {
      stuntingStatus = 'Pendek (Stunted)';
    } else if (zHeight >= -2 && zHeight <= 2) {
      stuntingStatus = 'Normal';
    } else if (zHeight > 2) {
      stuntingStatus = 'Tinggi';
    }

    return {
      bmi: +bmi.toFixed(2),
      bmiForAgeZ: +zBMI.toFixed(2),
      heightForAgeZ: +zHeight.toFixed(2),
      classification,
      stuntingStatus,
      error: null
    };

  } catch (error) {
    console.error('❌ Error dalam perhitungan Z-score balita:', error.message);
    return {
      bmi: null,
      bmiForAgeZ: null,
      heightForAgeZ: null,
      classification: 'Error perhitungan',
      stuntingStatus: 'Belum dapat ditentukan',
      error: 'Terjadi kesalahan dalam perhitungan. Silakan periksa kembali data yang dimasukkan.'
    };
  }
}

/**
 * Hitung status gizi dan risiko stunting ibu hamil
 * Berdasarkan BMI dan LILA (standar Kemenkes RI)
 * 
 * PENJELASAN:
 * - Ibu hamil dengan KEK (Kurang Energi Kronis) berisiko melahirkan bayi stunting
 * - KEK ditentukan dari: BMI < 18.5 ATAU LILA < 23.5 cm
 * - Status gizi ibu hamil sangat mempengaruhi pertumbuhan janin
 */
function calculatePregnantZScore({ weight, height, ageMonthsPregnant, lila }) {
  try {
    if (!weight || !height || weight <= 0 || height <= 0) {
      return {
        bmi: null,
        zScore: null,
        classification: 'Data tidak lengkap',
        nutritionStatus: 'Belum dapat ditentukan',
        stuntingRisk: 'Belum dapat ditentukan',
        lilaStatus: null,
        error: 'Berat badan dan tinggi badan harus diisi dengan benar'
      };
    }

    const bmi = weight / Math.pow(height / 100, 2);
    if (isNaN(bmi) || bmi <= 0) {
      return {
        bmi: null,
        zScore: null,
        classification: 'Data tidak valid',
        nutritionStatus: 'Belum dapat ditentukan',
        stuntingRisk: 'Belum dapat ditentukan',
        lilaStatus: null,
        error: 'Perhitungan BMI gagal, periksa kembali data tinggi dan berat badan'
      };
    }

    let zScore = 0;
    let bmiClassification = 'Normal';
    let nutritionStatus = 'Normal';
    
    if (bmi < PREGNANCY_BMI_REF.underweight) {
      zScore = -2.5;
      bmiClassification = 'Kurus (Underweight)';
      nutritionStatus = 'KEK (Kurang Energi Kronis)';
    } else if (bmi <= PREGNANCY_BMI_REF.normal) {
      zScore = 0;
      bmiClassification = 'Normal';
      nutritionStatus = 'Normal';
    } else if (bmi <= PREGNANCY_BMI_REF.overweight) {
      zScore = 1.5;
      bmiClassification = 'Kelebihan Berat Badan (Overweight)';
      nutritionStatus = 'Resti (Resiko Tinggi)';
    } else {
      zScore = 3;
      bmiClassification = 'Obesitas';
      nutritionStatus = 'Resti (Resiko Tinggi)';
    }

    let lilaStatus = null;
    let lilaRisk = null;
    
    if (lila && lila > 0) {
      if (lila < PREGNANCY_LILA_REF.kek) {
        lilaStatus = 'KEK (LILA < 23.5 cm)';
        lilaRisk = 'Tinggi';
        if (nutritionStatus !== 'KEK (Kurang Energi Kronis)') {
          nutritionStatus = 'KEK (Kurang Energi Kronis)';
        }
      } else {
        lilaStatus = 'Normal (LILA ≥ 23.5 cm)';
        lilaRisk = 'Rendah';
      }
    }

    let stuntingRisk = 'Rendah';
    let stuntingRiskDetail = '';
    
    if (bmi < PREGNANCY_BMI_REF.underweight || (lila && lila < PREGNANCY_LILA_REF.kek)) {
      stuntingRisk = 'Tinggi';
      stuntingRiskDetail = 'Ibu dengan KEK berisiko tinggi melahirkan bayi stunting';
    }
    else if (bmi > PREGNANCY_BMI_REF.overweight) {
      stuntingRisk = 'Sedang';
      stuntingRiskDetail = 'Obesitas dapat meningkatkan risiko komplikasi kehamilan';
    }
    else {
      stuntingRisk = 'Rendah';
      stuntingRiskDetail = 'Status gizi ibu baik, risiko stunting rendah';
    }

    if (ageMonthsPregnant && ageMonthsPregnant > 0) {
      const trimester = ageMonthsPregnant <= 3 ? 1 : ageMonthsPregnant <= 6 ? 2 : 3;
      
      if ((bmi < PREGNANCY_BMI_REF.underweight || (lila && lila < PREGNANCY_LILA_REF.kek)) && trimester <= 2) {
        stuntingRisk = 'Sangat Tinggi';
        stuntingRiskDetail = `KEK di Trimester ${trimester} - Perlu Intervensi Segera`;
      }
    }

    console.log('📊 Status Gizi Ibu Hamil:');
    console.log('   BMI:', bmi.toFixed(2));
    console.log('   Klasifikasi BMI:', bmiClassification);
    console.log('   Status Nutrisi:', nutritionStatus);
    console.log('   LILA:', lila || 'Tidak diukur', 'cm');
    console.log('   Status LILA:', lilaStatus || 'Tidak tersedia');
    console.log('   Risiko Stunting Bayi:', stuntingRisk);

    return {
      bmi: +bmi.toFixed(2),
      zScore: +zScore.toFixed(2),
      classification: bmiClassification,
      nutritionStatus,
      stuntingRisk,
      stuntingRiskDetail,
      lilaStatus,
      lilaRisk,
      error: null
    };

  } catch (error) {
    console.error('❌ Error dalam perhitungan status gizi ibu hamil:', error.message);
    return {
      bmi: null,
      zScore: null,
      classification: 'Error perhitungan',
      nutritionStatus: 'Belum dapat ditentukan',
      stuntingRisk: 'Belum dapat ditentukan',
      lilaStatus: null,
      error: 'Terjadi kesalahan dalam perhitungan. Silakan periksa kembali data yang dimasukkan.'
    };
  }
}

function validateMeasurementData(data, patientType) {
  const errors = [];

  if (patientType === 'balita') {
    if (!data.weight || data.weight <= 0) {
      errors.push('Berat badan balita harus lebih dari 0 kg');
    }
    if (!data.height || data.height <= 0) {
      errors.push('Tinggi badan balita harus lebih dari 0 cm');
    }
    if (!data.gender) {
      errors.push('Jenis kelamin harus diisi');
    }
    if (data.weight && (data.weight < 1 || data.weight > 50)) {
      errors.push('Berat badan balita tidak wajar (harus antara 1-50 kg)');
    }
    if (data.height && (data.height < 30 || data.height > 150)) {
      errors.push('Tinggi badan balita tidak wajar (harus antara 30-150 cm)');
    }
  } else if (patientType === 'ibu_hamil') {
    if (!data.weight || data.weight <= 0) {
      errors.push('Berat badan ibu hamil harus lebih dari 0 kg');
    }
    if (!data.height || data.height <= 0) {
      errors.push('Tinggi badan ibu hamil harus lebih dari 0 cm');
    }
    if (data.weight && (data.weight < 30 || data.weight > 200)) {
      errors.push('Berat badan ibu hamil tidak wajar (harus antara 30-200 kg)');
    }
    if (data.height && (data.height < 100 || data.height > 200)) {
      errors.push('Tinggi badan ibu hamil tidak wajar (harus antara 100-200 cm)');
    }
    if (data.lila && (data.lila < 15 || data.lila > 50)) {
      errors.push('LILA tidak wajar (harus antara 15-50 cm)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  calculateChildZScore,
  calculatePregnantZScore,
  validateMeasurementData
};