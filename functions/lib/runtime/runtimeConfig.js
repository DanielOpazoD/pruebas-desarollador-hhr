const DEFAULT_HOSPITAL_ID = 'hanga_roa';
const DEFAULT_HOSPITAL_CAPACITY = 38;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const HOSPITAL_ID = process.env.HOSPITAL_ID || DEFAULT_HOSPITAL_ID;
const HOSPITAL_CAPACITY = toPositiveInteger(
  process.env.HOSPITAL_CAPACITY,
  DEFAULT_HOSPITAL_CAPACITY
);

module.exports = {
  DEFAULT_HOSPITAL_CAPACITY,
  DEFAULT_HOSPITAL_ID,
  HOSPITAL_CAPACITY,
  HOSPITAL_ID,
};
