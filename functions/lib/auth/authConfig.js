const BOOTSTRAP_ADMIN_EMAILS = ['daniel.opazo@hospitalhangaroa.cl', 'd.opazo.damiani@gmail.com'];

const MANAGED_ASSIGNABLE_ROLES = new Set([
  'admin',
  'nurse_hospital',
  'doctor_urgency',
  'doctor_specialist',
  'viewer',
  'unauthorized',
]);

const GENERAL_LOGIN_ROLES = new Set([
  'admin',
  'nurse_hospital',
  'doctor_urgency',
  'doctor_specialist',
  'viewer',
  'editor',
]);

module.exports = {
  BOOTSTRAP_ADMIN_EMAILS,
  MANAGED_ASSIGNABLE_ROLES,
  GENERAL_LOGIN_ROLES,
};
