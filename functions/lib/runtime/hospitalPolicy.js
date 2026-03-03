const { HOSPITAL_ID } = require('./runtimeConfig');

const assertSupportedHospitalId = hospitalId => {
  if (!hospitalId || hospitalId !== HOSPITAL_ID) {
    throw new Error(`Unsupported hospitalId: ${hospitalId || 'missing'}`);
  }

  return hospitalId;
};

module.exports = {
  assertSupportedHospitalId,
};
