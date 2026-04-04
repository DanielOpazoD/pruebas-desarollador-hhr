import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../');

const ALLOWED_ROOT_DAILY_RECORD_IMPORTS = [
  'src/application/ports/dailyRecordPort.ts',
  'src/application/shared/dailyRecordContracts.ts',
  'src/hooks/contracts/dailyRecordHookContracts.ts',
  'src/schemas/zod/dailyRecord.ts',
  'src/schemas/zodSafeParsers.ts',
  'src/schemas/zodValidationHelpers.ts',
  'src/services/contracts/dailyRecordServiceContracts.ts',
  'src/services/repositories/conflictResolutionMatrix.ts',
  'src/services/repositories/contracts/dailyRecordCommands.ts',
  'src/services/repositories/contracts/dailyRecordQueries.ts',
  'src/services/repositories/contracts/dailyRecordResults.ts',
  'src/services/repositories/dailyRecordAdmissionDateWritePolicy.ts',
  'src/services/repositories/dailyRecordAggregate.ts',
  'src/services/repositories/dailyRecordClinicalDomainService.ts',
  'src/services/repositories/dailyRecordConsistencyPolicy.ts',
  'src/services/repositories/dailyRecordInitializationSeed.ts',
  'src/services/repositories/dailyRecordInitializationSupport.ts',
  'src/services/repositories/dailyRecordLocalCachePersistence.ts',
  'src/services/repositories/dailyRecordPersistenceGoldenPath.ts',
  'src/services/repositories/dailyRecordRemoteLoader.ts',
  'src/services/repositories/dailyRecordRepositoryFacadeSupport.ts',
  'src/services/repositories/dailyRecordRepositoryInitializationService.ts',
  'src/services/repositories/dailyRecordRepositoryLifecycleSupport.ts',
  'src/services/repositories/dailyRecordRepositoryReadService.ts',
  'src/services/repositories/dailyRecordRepositorySyncService.ts',
  'src/services/repositories/dailyRecordRepositoryWriteService.ts',
  'src/services/repositories/dailyRecordWriteSupport.ts',
  'src/services/repositories/dataMigration.ts',
  'src/services/repositories/dataMigrationContracts.ts',
  'src/services/repositories/helpers/validationHelper.ts',
  'src/services/repositories/legacyRecordBridgeService.ts',
  'src/services/repositories/ports/repositoryLegacyBridgePort.ts',
  'src/services/repositories/schemaEvolutionPolicy.ts',
  'src/services/repositories/schemaGovernance.ts',
  'src/services/storage/firestore/firestoreQuerySupport.ts',
  'src/services/storage/firestore/firestoreRecordQueries.ts',
  'src/services/storage/firestore/firestoreRecordWrites.ts',
  'src/services/storage/firestore/firestoreShared.ts',
  'src/services/storage/indexeddb/indexedDbContracts.ts',
  'src/services/storage/indexeddb/indexedDbCore.ts',
  'src/services/storage/indexeddb/indexedDbMigrationService.ts',
  'src/services/storage/indexeddb/indexedDbRecordService.ts',
  'src/services/storage/legacyfirebase/legacyFirebaseRecordQueries.ts',
  'src/services/storage/legacyfirebase/legacyFirebaseRecordReads.ts',
  'src/services/storage/legacyfirebase/legacyFirebaseRecordSubscription.ts',
  'src/services/storage/localpersistence/localPersistenceService.ts',
  'src/services/storage/localstorage/localStorageCore.ts',
  'src/services/storage/localstorage/localStorageRecordService.ts',
  'src/services/storage/sync/firestoreSyncTransport.ts',
  'src/services/storage/sync/syncQueueEngine.ts',
];

describe('DailyRecord root import governance', () => {
  it('keeps root DailyRecord imports confined to storage, repository, schema and contract layers', () => {
    const command =
      'rg -l "from \'@/types/domain/dailyRecord\'|from \\"@/types/domain/dailyRecord\\"" src --glob "!src/tests/**"';
    const rawOutput = execSync(command, { cwd: ROOT, encoding: 'utf8' });
    const referencedFiles = rawOutput
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .sort();

    expect(referencedFiles).toEqual(ALLOWED_ROOT_DAILY_RECORD_IMPORTS.sort());
  });
});
