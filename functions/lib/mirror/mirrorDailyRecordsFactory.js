const functions = require('firebase-functions/v1');
const { HOSPITAL_ID } = require('./mirrorConfig');
const {
  canParseMirrorRecordDate,
  shouldSkipMirroringDailyRecord,
} = require('./mirrorRuntimeSupport');

const createMirrorDailyRecords = ({ dbBeta, admin }) =>
  functions.firestore
    .document(`hospitals/${HOSPITAL_ID}/dailyRecords/{docId}`)
    .onWrite(async (change, context) => {
      const { docId } = context.params;

      if (!dbBeta) {
        console.error(
          'ERROR: dbBeta no está inicializada. Configura BETA_SERVICE_ACCOUNT_JSON/B64 o functions config mirror.beta_service_account_json/_b64.'
        );
        return null;
      }

      try {
        const docDate = canParseMirrorRecordDate(docId);
        if (docDate && shouldSkipMirroringDailyRecord({ docId, now: Date.now() })) {
          return null;
        }
      } catch (dateError) {
        console.warn(`⚠️ No se pudo parsear fecha de ${docId}:`, dateError.message);
      }

      const path = `hospitals/${HOSPITAL_ID}/dailyRecords/${docId}`;

      try {
        if (!change.after.exists) {
          console.warn(`⚠️ Documento borrado en Oficial: ${path}. NO se borra en Beta.`);
          return null;
        }

        const sourceData = change.after.data();
        const sourceLastUpdated = sourceData.lastUpdated?.toMillis
          ? sourceData.lastUpdated.toMillis()
          : 0;

        const betaDoc = await dbBeta.doc(path).get();
        if (betaDoc.exists) {
          const betaData = betaDoc.data();
          const betaSyncedAt = betaData._syncedAt?.toMillis ? betaData._syncedAt.toMillis() : 0;
          const betaLastUpdated = betaData.lastUpdated?.toMillis
            ? betaData.lastUpdated.toMillis()
            : 0;
          if (
            shouldSkipMirroringDailyRecord({
              docId,
              sourceLastUpdatedMs: sourceLastUpdated,
              betaSyncedAtMs: betaSyncedAt,
              betaLastUpdatedMs: betaLastUpdated,
              now: Date.now(),
            })
          ) {
            return null;
          }
        }

        return await dbBeta.doc(path).set(
          {
            ...sourceData,
            _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        console.error(`ERROR sincronizando ${docId}:`, error);
        return null;
      }
    });

module.exports = {
  createMirrorDailyRecords,
};
