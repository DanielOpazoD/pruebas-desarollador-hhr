import type { BedDefinition, DailyRecord, Statistics } from '@/types';
import type { CSSProperties } from 'react';

type ViewMode = 'REGISTER' | 'ANALYTICS';

export type CensusViewBranch = 'analytics' | 'empty' | 'register';

export interface ResolveCensusViewBranchParams {
  viewMode: ViewMode;
  beds: DailyRecord['beds'] | null;
}

export interface BuildEmptyDayPromptPropsParams {
  selectedDay: number;
  selectedMonth: number;
  currentDateString: string;
  previousRecordAvailable: boolean;
  previousRecordDate: string | undefined;
  availableDates: string[];
  onCreateDay: (copyFromPrevious: boolean, specificDate?: string) => void | Promise<void>;
  readOnly: boolean;
}

export interface BuildRegisterContentPropsParams {
  currentDateString: string;
  readOnly: boolean;
  localViewMode: 'TABLE' | '3D';
  beds: DailyRecord['beds'];
  visibleBeds: BedDefinition[];
  marginStyle: CSSProperties;
  stats: Statistics | null;
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
}

export const resolveCensusViewBranch = ({
  viewMode,
  beds,
}: ResolveCensusViewBranchParams): CensusViewBranch => {
  if (viewMode === 'ANALYTICS') {
    return 'analytics';
  }

  return beds ? 'register' : 'empty';
};

export const buildEmptyDayPromptProps = ({
  selectedDay,
  selectedMonth,
  currentDateString,
  previousRecordAvailable,
  previousRecordDate,
  availableDates,
  onCreateDay,
  readOnly,
}: BuildEmptyDayPromptPropsParams) => ({
  selectedDay,
  selectedMonth,
  currentDateString,
  previousRecordAvailable,
  previousRecordDate,
  availableDates,
  onCreateDay,
  readOnly,
});

export const buildRegisterContentProps = ({
  currentDateString,
  readOnly,
  localViewMode,
  beds,
  visibleBeds,
  marginStyle,
  stats,
  showBedManagerModal,
  onCloseBedManagerModal,
}: BuildRegisterContentPropsParams) => ({
  currentDateString,
  readOnly,
  localViewMode,
  beds,
  visibleBeds,
  marginStyle,
  stats,
  showBedManagerModal,
  onCloseBedManagerModal,
});
