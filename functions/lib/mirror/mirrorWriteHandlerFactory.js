const functions = require('firebase-functions/v1');
const { HOSPITAL_ID } = require('./mirrorConfig');

const createMirrorWriteHandler = ({ collection, logLabel, preserveDeletes = false, dbBeta }) =>
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

          return await dbBeta.doc(path).delete();
        }

        return await dbBeta.doc(path).set(change.after.data());
      } catch (error) {
        console.error(`ERROR sincronizando ${logLabel} ${docId}:`, error);
        return null;
      }
    });

module.exports = {
  createMirrorWriteHandler,
};
