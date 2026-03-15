import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useConfirmDialog, useNotification } from '@/context/UIContext';
import {
  buildReminderFromDraft,
  validateReminderDraft,
  type ReminderDraftInput,
} from '@/domain/reminders';
import {
  ReminderImageService,
  ReminderReadService,
  ReminderRepository,
} from '@/services/reminders';
import type { Reminder, ReminderReadReceipt } from '@/types';

const buildReminderId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `reminder-${crypto.randomUUID()}`;
  }
  return `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface ReminderAdminSubmission {
  draft: ReminderDraftInput;
  imageFile: File | null;
  removeImage: boolean;
}

export const useReminderAdmin = () => {
  const { user } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { confirm } = useConfirmDialog();

  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [formReminder, setFormReminder] = React.useState<Reminder | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [receiptsReminder, setReceiptsReminder] = React.useState<Reminder | null>(null);
  const [readReceipts, setReadReceipts] = React.useState<ReminderReadReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = ReminderRepository.subscribe(nextReminders => {
      setReminders(nextReminders);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const openCreateForm = React.useCallback(() => {
    setFormReminder(null);
    setIsFormOpen(true);
  }, []);

  const openEditForm = React.useCallback((reminder: Reminder) => {
    setFormReminder(reminder);
    setIsFormOpen(true);
  }, []);

  const closeForm = React.useCallback(() => {
    if (processing) return;
    setIsFormOpen(false);
    setFormReminder(null);
  }, [processing]);

  const saveReminder = React.useCallback(
    async ({ draft, imageFile, removeImage }: ReminderAdminSubmission) => {
      const issues = validateReminderDraft(draft);
      if (issues.length > 0) {
        notifyError('Avisos al personal', issues[0].message);
        return false;
      }

      const reminderId = formReminder?.id ?? buildReminderId();
      const now = new Date().toISOString();
      const previousImagePath = formReminder?.imagePath;
      const previousImageUrl = formReminder?.imageUrl;

      setProcessing(true);
      try {
        let nextImageUrl = removeImage ? undefined : previousImageUrl;
        let nextImagePath = removeImage ? undefined : previousImagePath;

        if (imageFile) {
          const upload = await ReminderImageService.uploadImage(reminderId, imageFile);
          nextImageUrl = upload.imageUrl;
          nextImagePath = upload.imagePath;
        }

        const reminder = buildReminderFromDraft(
          reminderId,
          {
            ...draft,
            imageUrl: nextImageUrl,
          },
          {
            createdBy: user?.uid ?? 'system',
            createdByName: user?.displayName?.trim() || user?.email?.trim() || 'Jefatura',
            createdAt: now,
            updatedAt: now,
          },
          formReminder
        );

        await ReminderRepository.create({
          ...reminder,
          imageUrl: nextImageUrl,
          imagePath: nextImagePath,
        });

        if (
          (removeImage || imageFile) &&
          previousImagePath &&
          previousImagePath !== nextImagePath
        ) {
          await ReminderImageService.deleteImage(previousImagePath);
        }

        success(
          'Avisos al personal',
          formReminder ? 'El aviso fue actualizado.' : 'El aviso fue creado.'
        );
        setIsFormOpen(false);
        setFormReminder(null);
        return true;
      } catch (error) {
        notifyError(
          'Avisos al personal',
          error instanceof Error ? error.message : 'No se pudo guardar el aviso.'
        );
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [formReminder, notifyError, success, user?.displayName, user?.email, user?.uid]
  );

  const deleteReminder = React.useCallback(
    async (reminder: Reminder) => {
      const accepted = await confirm({
        title: 'Eliminar aviso',
        message: `Se eliminará "${reminder.title}" y sus lecturas asociadas dejarán de estar disponibles.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'warning',
      });

      if (!accepted) return;

      setProcessing(true);
      try {
        await ReminderRepository.remove(reminder.id);
        await ReminderImageService.deleteImage(reminder.imagePath);
        success('Avisos al personal', 'El aviso fue eliminado.');
      } catch (error) {
        notifyError(
          'Avisos al personal',
          error instanceof Error ? error.message : 'No se pudo eliminar el aviso.'
        );
      } finally {
        setProcessing(false);
      }
    },
    [confirm, notifyError, success]
  );

  const openReadStatus = React.useCallback(async (reminder: Reminder) => {
    setReceiptsReminder(reminder);
    setReceiptsLoading(true);
    try {
      const receipts = await ReminderReadService.getReadReceipts(reminder.id);
      setReadReceipts(receipts);
    } finally {
      setReceiptsLoading(false);
    }
  }, []);

  const closeReadStatus = React.useCallback(() => {
    setReceiptsReminder(null);
    setReadReceipts([]);
    setReceiptsLoading(false);
  }, []);

  return {
    reminders,
    loading,
    processing,
    isFormOpen,
    formReminder,
    openCreateForm,
    openEditForm,
    closeForm,
    saveReminder,
    deleteReminder,
    receiptsReminder,
    readReceipts,
    receiptsLoading,
    openReadStatus,
    closeReadStatus,
  };
};
