const MAX_MIRROR_DAILY_RECORD_AGE_HOURS = 48;
const RECENT_SYNC_WINDOW_MS = 5000;

const canParseMirrorRecordDate = docId => {
  try {
    const docDate = new Date(`${docId}T00:00:00`);
    return Number.isFinite(docDate.getTime()) ? docDate : null;
  } catch (_error) {
    return null;
  }
};

const shouldSkipMirroringDailyRecord = ({
  docId,
  sourceLastUpdatedMs,
  betaSyncedAtMs,
  betaLastUpdatedMs,
  now = Date.now(),
}) => {
  const docDate = canParseMirrorRecordDate(docId);
  if (docDate) {
    const hoursElapsed = (now - docDate.getTime()) / (1000 * 60 * 60);
    if (hoursElapsed > MAX_MIRROR_DAILY_RECORD_AGE_HOURS) {
      return true;
    }
  }

  if (betaSyncedAtMs > 0 && now - betaSyncedAtMs < RECENT_SYNC_WINDOW_MS) {
    return true;
  }

  if (sourceLastUpdatedMs > 0 && sourceLastUpdatedMs === betaLastUpdatedMs) {
    return true;
  }

  return false;
};

module.exports = {
  MAX_MIRROR_DAILY_RECORD_AGE_HOURS,
  RECENT_SYNC_WINDOW_MS,
  canParseMirrorRecordDate,
  shouldSkipMirroringDailyRecord,
};
