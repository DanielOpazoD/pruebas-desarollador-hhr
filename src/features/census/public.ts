// Public API for code outside the census feature. Internal consumers should import local modules directly.
export { CensusView } from './components/CensusView';
export { CensusEmailConfigModal } from './components/CensusEmailConfigModal';
export type { CensusAccessProfile } from './types/censusAccessProfile';
export { isSpecialistCensusAccessProfile } from './types/censusAccessProfile';
export {
  resolveAdmissionsCountForRecord,
  resolveMovementSummaryState,
  resolveStaffSelectorsClassName,
  resolveStaffSelectorsState,
} from './controllers/censusStaffHeaderController';
