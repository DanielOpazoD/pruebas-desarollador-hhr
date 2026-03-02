const { createMirrorDailyRecords } = require('./mirror/mirrorDailyRecordsFactory');
const { createMirrorWriteHandler } = require('./mirror/mirrorWriteHandlerFactory');

const createMirrorFunctions = ({ dbBeta, admin }) => ({
  mirrorDailyRecords: createMirrorDailyRecords({ dbBeta, admin }),
  mirrorAuditLogs: createMirrorWriteHandler({
    collection: 'auditLogs',
    logLabel: 'log',
    dbBeta,
  }),
  mirrorSettings: createMirrorWriteHandler({
    collection: 'settings',
    logLabel: 'setting',
    dbBeta,
  }),
  mirrorTransferRequests: createMirrorWriteHandler({
    collection: 'transferRequests',
    logLabel: 'transfer request',
    dbBeta,
  }),
});

module.exports = {
  createMirrorFunctions,
};
