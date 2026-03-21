import { createContext, useContext } from 'react';
import {
  IDailyRecordRepository,
  DailyRecordRepository,
} from './repositories/DailyRecordRepository';
import { ICatalogRepository, CatalogRepository } from './repositories/CatalogRepository';

/**
 * Interface defining the set of repositories available in the application.
 */
export interface IRepositoryContainer {
  dailyRecord: IDailyRecordRepository;
  catalog: ICatalogRepository;
}

/**
 * Default container using concrete implementations.
 */
export const defaultRepositories: IRepositoryContainer = {
  dailyRecord: DailyRecordRepository,
  catalog: CatalogRepository,
};

export const createRepositoryContainer = (
  overrides: Partial<IRepositoryContainer> = {}
): IRepositoryContainer => ({
  ...defaultRepositories,
  ...overrides,
});

export const createTestRepositoryContainer = (
  overrides: Partial<IRepositoryContainer> = {}
): IRepositoryContainer => createRepositoryContainer(overrides);

const RepositoryContext = createContext<IRepositoryContainer | undefined>(undefined);

/**
 * Hook to access the repository container.
 * This is the core of our Dependency Injection system.
 */
export const useRepositories = (): IRepositoryContainer => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
};

export const RepositoryProvider = RepositoryContext.Provider;
