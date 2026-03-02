const functions = require('firebase-functions/v1');
const { calculateMinsalStatistics } = require('./minsal/minsalStatsCalculator');

const createMinsalFunctions = ({ admin, hospitalCapacity, hasCallableClinicalAccess }) => ({
  calculateMinsalStats: functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const hasAccess = await hasCallableClinicalAccess(context);
    if (!hasAccess) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'You do not have access to this operation.'
      );
    }

    const { hospitalId, startDate, endDate } = data;
    if (!hospitalId || !startDate || !endDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required parameters: hospitalId, startDate, endDate.'
      );
    }

    const recordsRef = admin
      .firestore()
      .collection('hospitals')
      .doc(hospitalId)
      .collection('dailyRecords');

    try {
      const snapshot = await recordsRef
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      const filteredRecords = [];
      snapshot.forEach(doc => {
        filteredRecords.push(doc.data());
      });
      return calculateMinsalStatistics({
        records: filteredRecords,
        hospitalCapacity,
        startDate,
        endDate,
      });
    } catch (error) {
      console.error('Error calculating statistics:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Error calculating statistics: ${error.message}`
      );
    }
  }),
});

module.exports = {
  createMinsalFunctions,
};
