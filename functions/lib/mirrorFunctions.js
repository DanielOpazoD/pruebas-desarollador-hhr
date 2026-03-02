const functions = require('firebase-functions/v1');

const HOSPITAL_ID = 'hanga_roa';

const createMirrorWriteHandler = ({
  collection,
  logLabel,
  preserveDeletes = false,
  dbBeta,
  admin,
}) =>
  functions.firestore
    .document(`hospitals/${HOSPITAL_ID}/${collection}/{docId}`)
    .onWrite(async (change, context) => {
      const { docId } = context.params;

      if (!dbBeta) {
        console.error(`ERROR: dbBeta no está inicializada para ${collection}.`);
        return null;
      }

      const path = `hospitals/${HOSPITAL_ID}/${collection}/${docId}`;

      try {
        if (!change.after.exists) {
          if (preserveDeletes) {
            console.warn(`⚠️ Documento borrado en Oficial: ${path}. NO se borra en Beta.`);
            return null;
          }

          console.info(`Borrando ${logLabel} en Beta: ${path}`);
          return await dbBeta.doc(path).delete();
        }

        const data = change.after.data();
        console.info(`Sincronizando ${logLabel}: ${docId}`);
        return await dbBeta.doc(path).set(data);
      } catch (error) {
        console.error(`ERROR sincronizando ${logLabel} ${docId}:`, error);
        return null;
      }
    });

const createMirrorFunctions = ({ dbBeta, admin }) => ({
  mirrorDailyRecords: functions.firestore
    .document(`hospitals/${HOSPITAL_ID}/dailyRecords/{docId}`)
    .onWrite(async (change, context) => {
      const { docId } = context.params;

      if (!dbBeta) {
        console.error('ERROR: dbBeta no está inicializada. Revisa llave-beta.json');
        return null;
      }

      try {
        const docDate = new Date(`${docId}T00:00:00`);
        const hoursElapsed = (Date.now() - docDate.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed > 48) {
          console.info(
            `🔒 FROZEN: ${docId} tiene ${Math.round(hoursElapsed)}h de antigüedad (>48h). No se sincroniza.`
          );
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

          const now = Date.now();
          if (now - betaSyncedAt < 5000) {
            console.info(
              `⏸️ DEBOUNCE: ${docId} sincronizado hace ${Math.round((now - betaSyncedAt) / 1000)}s. Ignorando.`
            );
            return null;
          }

          if (sourceLastUpdated === betaLastUpdated) {
            console.debug(`🔄 SIN CAMBIOS: ${docId} ya tiene los mismos datos. Ignorando.`);
            return null;
          }
        }

        const dataToSync = {
          ...sourceData,
          _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.info(`✅ Sincronizando ${docId} a Beta...`);
        return await dbBeta.doc(path).set(dataToSync, { merge: true });
      } catch (error) {
        console.error(`ERROR sincronizando ${docId}:`, error);
        return null;
      }
    }),
  mirrorAuditLogs: createMirrorWriteHandler({
    collection: 'auditLogs',
    logLabel: 'log',
    dbBeta,
    admin,
  }),
  mirrorSettings: createMirrorWriteHandler({
    collection: 'settings',
    logLabel: 'setting',
    dbBeta,
    admin,
  }),
  mirrorTransferRequests: createMirrorWriteHandler({
    collection: 'transferRequests',
    logLabel: 'transfer request',
    dbBeta,
    admin,
  }),
});

module.exports = {
  createMirrorFunctions,
};
