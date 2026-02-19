import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getDoc } from 'firebase/firestore';
import { DailyRecord } from '@/types';

const runEmulatorTests =
  process.env.RUN_FIRESTORE_EMULATOR_TESTS === '1' ||
  process.env.FIRESTORE_EMULATOR_HOST !== undefined;

const describeEmulator = runEmulatorTests ? describe : describe.skip;

let activeDb: unknown;

vi.mock('@/firebaseConfig', () => ({
  get db() {
    return activeDb;
  },
}));

import {
  ConcurrencyError,
  saveRecordToFirestore,
  updateRecordPartial,
} from '@/services/storage/firestore/firestoreRecordWrites';
import { getRecordFromFirestore } from '@/services/storage/firestore/firestoreRecordQueries';
import { getRecordDocRef } from '@/services/storage/firestore/firestoreShared';

const buildRecord = (date: string, lastUpdated: string): DailyRecord => ({
  date,
  beds: {},
  discharges: [],
  transfers: [],
  cma: [],
  lastUpdated,
  nurses: [],
  nursesDayShift: [],
  nursesNightShift: [],
  tensDayShift: [],
  tensNightShift: [],
  activeExtraBeds: [],
  dateTimestamp: Date.parse(`${date}T00:00:00.000Z`),
});

describeEmulator('Firestore emulator sync concurrency flow', () => {
  let testEnv: RulesTestEnvironment;
  let nurseDb: unknown;

  beforeAll(async () => {
    const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: 'demo-hhr-sync-emulator-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });

    nurseDb = testEnv
      .authenticatedContext('user_nurse', {
        email: 'hospitalizados@hospitalhangaroa.cl',
        role: 'nurse_hospital',
      })
      .firestore();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    activeDb = nurseDb;
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('throws ConcurrencyError when expectedLastUpdated is older than remote', async () => {
    const date = '2026-02-19';
    await testEnv.withSecurityRulesDisabled(async context => {
      await context
        .firestore()
        .doc(`hospitals/hanga_roa/dailyRecords/${date}`)
        .set({
          ...buildRecord(date, '2026-02-19T10:00:00.000Z'),
          handoffNovedadesDayShift: 'remote',
        });
    });

    const local = buildRecord(date, '2026-02-19T09:59:00.000Z');
    local.handoffNovedadesDayShift = 'local';

    await expect(saveRecordToFirestore(local, '2026-02-19T09:59:00.000Z')).rejects.toBeInstanceOf(
      ConcurrencyError
    );

    let remoteSnap: { data: () => Record<string, unknown> | undefined } | undefined;
    await testEnv.withSecurityRulesDisabled(async context => {
      remoteSnap = await context.firestore().doc(`hospitals/hanga_roa/dailyRecords/${date}`).get();
    });
    expect(remoteSnap?.data()?.handoffNovedadesDayShift).toBe('remote');
  });

  it('saves when expectedLastUpdated matches remote baseline', async () => {
    const date = '2026-02-20';
    await testEnv.withSecurityRulesDisabled(async context => {
      await context
        .firestore()
        .doc(`hospitals/hanga_roa/dailyRecords/${date}`)
        .set({
          ...buildRecord(date, '2026-02-20T09:00:00.000Z'),
          handoffNovedadesNightShift: 'remote baseline',
        });
    });

    const local = buildRecord(date, '2026-02-20T09:00:00.000Z');
    local.handoffNovedadesNightShift = 'local update';

    await expect(saveRecordToFirestore(local, '2026-02-20T09:00:00.000Z')).resolves.toBeUndefined();

    const persisted = await getRecordFromFirestore(date);
    expect(persisted?.handoffNovedadesNightShift).toBe('local update');
  });

  it('rejects partial update on missing doc due security rules precondition', async () => {
    const date = '2026-02-21';

    await expect(
      updateRecordPartial(date, { 'beds.R1.patientName': 'Paciente Fallback' })
    ).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('applies partial update when record exists and is within nurse edit window', async () => {
    const date = '2026-02-21';
    const now = Date.now();
    await testEnv.withSecurityRulesDisabled(async context => {
      await context
        .firestore()
        .doc(`hospitals/hanga_roa/dailyRecords/${date}`)
        .set({
          ...buildRecord(date, '2026-02-21T07:00:00.000Z'),
          dateTimestamp: now,
        });
    });

    await expect(
      updateRecordPartial(date, {
        'beds.R1.patientName': 'Paciente Parcial',
        'beds.R1.pathology': 'Dx Parcial',
      })
    ).resolves.toBeUndefined();

    const snap = await getDoc(getRecordDocRef(date));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.beds?.R1?.patientName).toBe('Paciente Parcial');
  });
});
