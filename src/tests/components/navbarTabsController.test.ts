import { describe, expect, it } from 'vitest';
import { resolveIsNavbarItemActive } from '@/components/layout/navbar/navbarTabsController';

describe('navbarTabsController', () => {
  it('resolves item active state including CUDYR alias for NURSING_HANDOFF', () => {
    expect(
      resolveIsNavbarItemActive({
        currentModule: 'CENSUS',
        itemModule: 'CENSUS',
        censusViewMode: 'REGISTER',
        itemCensusMode: 'REGISTER',
      })
    ).toBe(true);

    expect(
      resolveIsNavbarItemActive({
        currentModule: 'CUDYR',
        itemModule: 'NURSING_HANDOFF',
        censusViewMode: 'REGISTER',
      })
    ).toBe(true);

    expect(
      resolveIsNavbarItemActive({
        currentModule: 'CENSUS',
        itemModule: 'CENSUS',
        censusViewMode: 'REGISTER',
        itemCensusMode: 'ANALYTICS',
      })
    ).toBe(false);
  });
});
