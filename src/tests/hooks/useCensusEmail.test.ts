import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCensusEmail } from '@/hooks/useCensusEmail';
import { useConfirmDialog } from '@/context/UIContext';
import { getAppSetting, saveAppSetting } from '@/services/settingsService';
import { useCensusEmailRecipientLists } from '@/hooks/useCensusEmailRecipientLists';
import { useCensusEmailDeliveryActions } from '@/hooks/useCensusEmailDeliveryActions';
import { DailyRecord } from '@/types/domain/dailyRecord';

vi.mock('@/context/UIContext', () => ({
  useConfirmDialog: vi.fn(),
}));

vi.mock('@/services/settingsService', () => ({
  getAppSetting: vi.fn(),
  saveAppSetting: vi.fn(),
}));

vi.mock('@/hooks/useCensusEmailRecipientLists', () => ({
  useCensusEmailRecipientLists: vi.fn(),
}));

vi.mock('@/hooks/useCensusEmailDeliveryActions', () => ({
  useCensusEmailDeliveryActions: vi.fn(),
}));

describe('useCensusEmail', () => {
  const mockConfirm = vi.fn();
  const mockAlert = vi.fn();
  const sendEmail = vi.fn();
  const sendEmailWithLink = vi.fn();
  const generateShareLink = vi.fn();
  const copyShareLink = vi.fn();

  const defaultParams = {
    record: {
      date: '2025-01-08',
      beds: {},
      discharges: [],
      transfers: [],
      lastUpdated: '',
      nurses: [],
      activeExtraBeds: [],
      cma: [],
    } as unknown as DailyRecord,
    currentDateString: '2025-01-08',
    nurseSignature: 'Nurse Name',
    selectedYear: 2025,
    selectedMonth: 0,
    selectedDay: 8,
    user: { email: 'admin@test.com', role: 'admin' },
    role: 'admin',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useConfirmDialog).mockReturnValue({
      confirm: mockConfirm,
      alert: mockAlert,
    } as unknown as ReturnType<typeof useConfirmDialog>);

    vi.mocked(getAppSetting).mockResolvedValue(['Hoja diaria', 'Resumen']);
    vi.mocked(saveAppSetting).mockResolvedValue(undefined);

    vi.mocked(useCensusEmailRecipientLists).mockReturnValue({
      recipients: ['test@test.com'],
      setRecipients: vi.fn(),
      recipientLists: [],
      activeRecipientListId: 'census-default',
      setActiveRecipientListId: vi.fn(),
      createRecipientList: vi.fn(),
      renameActiveRecipientList: vi.fn(),
      deleteRecipientList: vi.fn(),
      recipientsSource: 'firebase',
      isRecipientsSyncing: false,
      recipientsSyncError: null,
    });

    vi.mocked(useCensusEmailDeliveryActions).mockReturnValue({
      sendEmail,
      sendEmailWithLink,
      generateShareLink,
      copyShareLink,
    });
  });

  it('initializes facade state and recipients', async () => {
    const { result } = renderHook(() => useCensusEmail(defaultParams));

    expect(result.current.status).toBe('idle');
    expect(result.current.showEmailConfig).toBe(false);
    expect(result.current.isAdminUser).toBe(true);
    expect(result.current.recipients).toEqual(['test@test.com']);

    await waitFor(() => {
      expect(getAppSetting).toHaveBeenCalledWith('censusEmailExcelSheetConfig', expect.any(Object));
    });
  });

  it('updates message when nurseSignature changes until manual edit occurs', async () => {
    const { result, rerender } = renderHook(props => useCensusEmail(props), {
      initialProps: defaultParams,
    });

    expect(result.current.message).toContain('Nurse Name');

    act(() => {
      rerender({ ...defaultParams, nurseSignature: 'New Nurse' });
    });

    await waitFor(() => {
      expect(result.current.message).toContain('New Nurse');
    });

    act(() => {
      result.current.onMessageChange('Manual edit');
    });

    act(() => {
      rerender({ ...defaultParams, nurseSignature: 'Third Nurse' });
    });

    await waitFor(() => {
      expect(result.current.message).toBe('Manual edit');
    });
  });

  it('resets send state when currentDateString changes', async () => {
    const { result, rerender } = renderHook(props => useCensusEmail(props), {
      initialProps: defaultParams,
    });

    act(() => {
      rerender({ ...defaultParams, currentDateString: '2025-01-09' });
    });

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });

  it('delegates send and share actions to the delivery hook boundary', async () => {
    const { result } = renderHook(() => useCensusEmail(defaultParams));

    await act(async () => {
      await result.current.sendEmail();
      await result.current.sendEmailWithLink();
      await result.current.generateShareLink();
      await result.current.copyShareLink();
    });

    expect(sendEmail).toHaveBeenCalled();
    expect(sendEmailWithLink).toHaveBeenCalled();
    expect(generateShareLink).toHaveBeenCalled();
    expect(copyShareLink).toHaveBeenCalled();
  });

  it('uses shared capability gating for global lists and admin test mode', async () => {
    renderHook(() =>
      useCensusEmail({
        ...defaultParams,
        role: 'nurse_hospital',
        user: { email: 'nurse@test.com', role: 'nurse_hospital' },
      })
    );

    await waitFor(() => {
      expect(getAppSetting).toHaveBeenCalled();
    });

    expect(useCensusEmailRecipientLists).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canManageGlobalRecipientLists: true,
      })
    );

    const { result } = renderHook(() =>
      useCensusEmail({
        ...defaultParams,
        role: 'doctor_specialist',
        user: { email: 'specialist@test.com', role: 'doctor_specialist' },
      })
    );

    await waitFor(() => {
      expect(result.current.isAdminUser).toBe(false);
    });

    expect(useCensusEmailRecipientLists).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canManageGlobalRecipientLists: false,
      })
    );
  });
});
