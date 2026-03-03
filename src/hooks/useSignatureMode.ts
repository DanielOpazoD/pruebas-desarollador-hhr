/**
 * useSignatureMode
 * Handles URL-based signature mode for medical handoffs
 */
import { useMemo } from 'react';

interface SignatureModeResult {
  isSignatureMode: boolean;
  signatureDate: string | null;
  currentDateString: string;
}

export function useSignatureMode(
  navDateString: string,
  _user: unknown,
  _authLoading: boolean
): SignatureModeResult {
  // Parse URL params
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isSignatureMode = urlParams.get('mode') === 'signature';
  const signatureDate = urlParams.get('date');

  // Determine effective date
  const currentDateString = useMemo(() => {
    if (isSignatureMode && signatureDate) {
      // Support DD-MM-YYYY format
      if (signatureDate.includes('-') && signatureDate.split('-')[0].length <= 2) {
        const [d, m, y] = signatureDate.split('-');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return signatureDate;
    }
    return navDateString;
  }, [isSignatureMode, signatureDate, navDateString]);

  return {
    isSignatureMode,
    signatureDate,
    currentDateString,
  };
}
