import { describe, expect, it } from 'vitest';
import {
  shouldRenderBookmarkBar,
  shouldRenderDateStrip,
} from '@/components/layout/app-content/appContentVisibilityController';

describe('appContentVisibilityController', () => {
  it('renders date strip for clinical modules and hides it for statistics', () => {
    expect(
      shouldRenderDateStrip({
        currentModule: 'CENSUS',
        censusViewMode: 'REGISTER',
        isSignatureMode: false,
      })
    ).toBe(true);

    expect(
      shouldRenderDateStrip({
        currentModule: 'ANALYTICS',
        censusViewMode: 'REGISTER',
        isSignatureMode: false,
      })
    ).toBe(false);
  });

  it('hides date strip in signature mode', () => {
    expect(
      shouldRenderDateStrip({
        currentModule: 'CUDYR',
        censusViewMode: 'REGISTER',
        isSignatureMode: true,
      })
    ).toBe(false);
  });

  it('renders bookmark bar only for allowed roles and context', () => {
    expect(
      shouldRenderBookmarkBar({
        currentModule: 'CENSUS',
        censusViewMode: 'REGISTER',
        isSignatureMode: false,
        showBookmarksBar: true,
        role: 'admin',
      })
    ).toBe(true);

    expect(
      shouldRenderBookmarkBar({
        currentModule: 'CENSUS',
        censusViewMode: 'REGISTER',
        isSignatureMode: false,
        showBookmarksBar: true,
        role: 'doctor_urgency',
      })
    ).toBe(false);
  });
});
