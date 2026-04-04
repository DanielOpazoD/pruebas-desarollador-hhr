import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DefaultRepositoryProvider,
  RepositoryProvider,
  createDefaultRepositoryContainer,
  createTestRepositoryContainer,
  useRepositories,
} from '@/services/RepositoryContext';

describe('RepositoryContext', () => {
  it('requires RepositoryProvider at runtime', () => {
    expect(() => renderHook(() => useRepositories())).toThrow(
      'useRepositories must be used within a RepositoryProvider'
    );
  });

  it('allows tests to inject explicit repository doubles', () => {
    const customDailyRecordRepository = {
      getForDate: vi.fn(),
    } as never;

    const repositories = createTestRepositoryContainer({
      dailyRecord: customDailyRecordRepository,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepositoryProvider value={repositories}>{children}</RepositoryProvider>
    );

    const { result } = renderHook(() => useRepositories(), { wrapper });

    expect(result.current.dailyRecord).toBe(customDailyRecordRepository);
    expect(result.current.catalog).toBeDefined();
  });

  it('builds the default repository container through a factory', () => {
    const repositories = createDefaultRepositoryContainer();

    expect(repositories.dailyRecord).toBeDefined();
    expect(repositories.catalog).toBeDefined();
  });

  it('provides the default repository container through DefaultRepositoryProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DefaultRepositoryProvider>{children}</DefaultRepositoryProvider>
    );

    const { result } = renderHook(() => useRepositories(), { wrapper });

    expect(result.current.dailyRecord).toBeDefined();
    expect(result.current.catalog).toBeDefined();
  });
});
