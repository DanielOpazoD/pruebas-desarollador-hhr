import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReminderCenterProvider } from '@/context/ReminderCenterContext';
import { useReminderCenter } from '@/hooks/useReminders';

const subscribeMock = vi.fn();
const hasUserReadMock = vi.fn();
const markAsReadMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user-1',
      email: 'nurse@hospitalhangaroa.cl',
      displayName: 'Enfermera Test',
    },
    role: 'nurse_hospital',
    isAuthenticated: true,
  }),
}));

vi.mock('@/services/reminders', () => ({
  ReminderRepository: {
    subscribe: (...args: unknown[]) => subscribeMock(...args),
  },
  ReminderReadService: {
    hasUserRead: (...args: unknown[]) => hasUserReadMock(...args),
    markAsRead: (...args: unknown[]) => markAsReadMock(...args),
    buildReceipt: vi.fn(({ userId, userName, shift, dateKey }) => ({
      userId,
      userName,
      shift,
      dateKey,
      readAt: '2026-03-15T12:00:00.000Z',
    })),
  },
}));

vi.mock('@/services/admin/attributionService', () => ({
  getCurrentShift: () => 'day',
}));

const reminder = {
  id: 'rem-1',
  title: 'Actualizar carro de paro',
  message: 'Revisar checklist antes de las 09:00.',
  type: 'urgent',
  targetRoles: ['nurse_hospital'],
  targetShifts: ['day'],
  startDate: '2026-03-01',
  endDate: '2026-03-31',
  priority: 3,
  isActive: true,
  createdBy: 'admin-1',
  createdByName: 'Jefatura',
  createdAt: '2026-03-10T08:00:00.000Z',
  updatedAt: '2026-03-10T08:00:00.000Z',
} as const;

const ReminderProbe: React.FC = () => {
  const { unreadCount, isOpen, markReminderAsRead } = useReminderCenter();

  return (
    <div>
      <span data-testid="unread-count">{unreadCount}</span>
      <span data-testid="modal-state">{isOpen ? 'open' : 'closed'}</span>
      <button type="button" onClick={() => void markReminderAsRead('rem-1')}>
        mark
      </button>
    </div>
  );
};

describe('ReminderCenterProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    hasUserReadMock.mockResolvedValue(false);
    subscribeMock.mockImplementation((callback: (reminders: unknown[]) => void) => {
      callback([reminder]);
      return () => undefined;
    });
  });

  it('expone avisos no leidos sin autoabrir el centro', async () => {
    render(
      <ReminderCenterProvider>
        <ReminderProbe />
      </ReminderCenterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('1');
    });

    expect(screen.getByTestId('modal-state').textContent).toBe('closed');
  });

  it('marca un aviso como leido y reduce el contador', async () => {
    render(
      <ReminderCenterProvider>
        <ReminderProbe />
      </ReminderCenterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('1');
    });

    await act(async () => {
      fireEvent.click(screen.getByText('mark'));
    });

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('unread-count').textContent).toBe('0');
    });

    expect(markAsReadMock).toHaveBeenCalledWith(
      'rem-1',
      expect.objectContaining({
        userId: 'user-1',
        shift: 'day',
        dateKey: '2026-03-15',
      })
    );
  });

  it('vuelve a mostrar el aviso si cambia el turno o la fecha de lectura', async () => {
    hasUserReadMock.mockImplementation(
      async (_reminderId: string, _userId: string, shift: string, dateKey: string) =>
        shift === 'day' && dateKey === '2026-03-15'
    );

    render(
      <ReminderCenterProvider>
        <ReminderProbe />
      </ReminderCenterProvider>
    );

    await waitFor(() => {
      expect(hasUserReadMock).toHaveBeenCalledWith('rem-1', 'user-1', 'day', '2026-03-15');
      expect(screen.getByTestId('unread-count').textContent).toBe('0');
    });
  });

  it('no autoabre el modal cuando la suscripcion falla por permisos', async () => {
    subscribeMock.mockImplementation(
      (
        callback: (reminders: unknown[]) => void,
        options?: { onError?: (error: unknown, kind: string) => void }
      ) => {
        options?.onError?.({ code: 'permission-denied' }, 'permission_denied');
        callback([]);
        return () => undefined;
      }
    );

    render(
      <ReminderCenterProvider>
        <ReminderProbe />
      </ReminderCenterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('unread-count').textContent).toBe('0');
    });

    expect(screen.getByTestId('modal-state').textContent).toBe('closed');
  });
});
