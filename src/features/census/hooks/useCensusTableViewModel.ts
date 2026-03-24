import { useCensusTableRuntime } from './useCensusTableRuntime';

interface UseCensusTableViewModelParams {
  currentDateString: string;
}

export const useCensusTableViewModel = ({ currentDateString }: UseCensusTableViewModelParams) => {
  return useCensusTableRuntime({ currentDateString });
};
