import { handler as sendCensusEmailHandler } from '../netlify/functions/send-census-email';
import { formatDateDDMMYYYY } from '../services';
import type { DailyRecord } from '../src/types';
import { getTodayISO } from '../utils/dateUtils';

const buildRecord = (date: string): DailyRecord => ({
  date,
  beds: {},
  discharges: [],
  transfers: [],
  cma: [],
  lastUpdated: `${date}T00:00:00.000Z`,
  nurses: [],
  nursesDayShift: [],
  nursesNightShift: [],
  tensDayShift: [],
  tensNightShift: [],
  activeExtraBeds: [],
  handoffDayChecklist: {},
  handoffNightChecklist: {},
  handoffNovedadesDayShift: '',
  handoffNovedadesNightShift: '',
  medicalHandoffNovedades: '',
  medicalHandoffDoctor: '',
});

const run = async () => {
  const today = getTodayISO();
  const records = [buildRecord(today)];
  type HandlerEvent = Parameters<typeof sendCensusEmailHandler>[0];

  const event: HandlerEvent = {
    httpMethod: 'POST',
    headers: {
      'x-user-role': 'nurse_hospital',
      'x-user-email': 'local-test@example.com',
    },
    body: JSON.stringify({
      date: today,
      records,
      recipients: process.env.TEST_CENSUS_EMAIL ? [process.env.TEST_CENSUS_EMAIL] : undefined,
      nursesSignature: `Script local - ${formatDateDDMMYYYY(today)}`,
    }),
  };

  const response = await sendCensusEmailHandler(event);
  console.log('Respuesta de prueba:', response);
};

run().catch(err => {
  console.error('Error ejecutando prueba local de envío de correo', err);
  process.exit(1);
});
