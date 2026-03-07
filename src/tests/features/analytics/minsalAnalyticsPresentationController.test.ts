import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ANALYTICS_PRESENTATION_COPY,
  resolveAnalyticsPresentationCopy,
} from '@/features/analytics/controllers/minsalAnalyticsPresentationController';

describe('minsalAnalyticsPresentationController', () => {
  it('returns explicit labels for period and current snapshot metrics', () => {
    expect(resolveAnalyticsPresentationCopy()).toEqual(DEFAULT_ANALYTICS_PRESENTATION_COPY);
    expect(DEFAULT_ANALYTICS_PRESENTATION_COPY.periodOccupancyTitle).toBe('Ocupación del período');
    expect(DEFAULT_ANALYTICS_PRESENTATION_COPY.currentSnapshotTitle).toBe('Situación actual');
  });
});
