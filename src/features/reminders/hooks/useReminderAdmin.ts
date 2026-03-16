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
  resolveReminderAdminErrorMessage,
} from '@/services/reminders';
import type { Reminder, ReminderReadReceipt } from '@/types/reminders';

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

type ReminderSaveResult =
  | 'saved_without_image'
  | 'saved_with_image'
  | 'permission_denied_image_upload';

export const useReminderAdmin = () => {
  const { currentUser } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { confirm } = useConfirmDialog();

  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [formReminder, setFormReminder] = React.useState<Reminder | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [receiptsReminder, setReceiptsReminder] = React.useState<Reminder | null>(null);
  const [readReceipts, setReadReceipts] = React.useState<ReminderReadReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = React.useState(false);

  React.useEffect(() => {
    setLoadError(null);
    const unsubscribe = ReminderRepository.subscribe(
      nextReminders => {
        setReminders(nextReminders);
        setLoading(false);
      },
      {
        onError: error => {
          setLoading(false);
          setLoadError(resolveReminderAdminErrorMessage(error, { operation: 'firestore_read' }));
        },
      }
    );
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
      const nextImageWasRemoved = removeImage && Boolean(previousImagePath);

      setProcessing(true);
      try {
        const reminder = buildReminderFromDraft(
          reminderId,
          {
            ...draft,
            imageUrl: removeImage ? undefined : formReminder?.imageUrl,
          },
          {
            createdBy: currentUser?.uid ?? 'system',
            createdByName:
              currentUser?.displayName?.trim() || currentUser?.email?.trim() || 'Jefatura',
            createdAt: now,
            updatedAt: now,
          },
          formReminder
        );

        const createResult = await ReminderRepository.createWithResult({
          ...reminder,
          imageUrl: removeImage ? undefined : reminder.imageUrl,
          imagePath: removeImage ? undefined : formReminder?.imagePath,
        });

        if (createResult.status !== 'success') {
          throw createResult.error;
        }

        let saveResult: ReminderSaveResult = 'saved_without_image';

        if (nextImageWasRemoved && previousImagePath) {
          try {
            await ReminderImageService.deleteImage(previousImagePath);
          } catch (error) {
            notifyError(
              'Avisos al personal',
              resolveReminderAdminErrorMessage(error, { operation: 'image_delete' })
            );
          }
        }

        if (imageFile) {
          try {
            const upload = await ReminderImageService.uploadImage(reminderId, imageFile);
            const updateResult = await ReminderRepository.updateWithResult(reminderId, {
              imageUrl: upload.imageUrl,
              imagePath: upload.imagePath,
              updatedAt: new Date().toISOString(),
            });

            if (updateResult.status !== 'success') {
              throw updateResult.error;
            }

            if (previousImagePath && previousImagePath !== upload.imagePath) {
              try {
                await ReminderImageService.deleteImage(previousImagePath);
              } catch (error) {
                notifyError(
                  'Avisos al personal',
                  resolveReminderAdminErrorMessage(error, { operation: 'image_delete' })
                );
              }
            }

            saveResult = 'saved_with_image';
          } catch (error) {
            saveResult = 'permission_denied_image_upload';
            notifyError(
              'Avisos al personal',
              resolveReminderAdminErrorMessage(error, { operation: 'image_upload' })
            );
          }
        }

        success('Avisos al personal', resolveSaveResultMessage(formReminder, saveResult));
        setIsFormOpen(false);
        setFormReminder(null);
        return true;
      } catch (error) {
        notifyError(
          'Avisos al personal',
          resolveReminderAdminErrorMessage(error, { operation: 'firestore_write' })
        );
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [
      currentUser?.displayName,
      currentUser?.email,
      currentUser?.uid,
      formReminder,
      notifyError,
      success,
    ]
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
        const removeResult = await ReminderRepository.removeWithResult(reminder.id);
        if (removeResult.status !== 'success') {
          throw removeResult.error;
        }
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

  const openReadStatus = React.useCallback(
    async (reminder: Reminder) => {
      setReceiptsReminder(reminder);
      setReceiptsLoading(true);
      try {
        const result = await ReminderReadService.getReadReceiptsWithResult(reminder.id);
        setReadReceipts(result.receipts);
        if (result.status !== 'success') {
          notifyError(
            'Avisos al personal',
            resolveReminderAdminErrorMessage(result.error, { operation: 'firestore_read' })
          );
        }
      } finally {
        setReceiptsLoading(false);
      }
    },
    [notifyError]
  );

  const closeReadStatus = React.useCallback(() => {
    setReceiptsReminder(null);
    setReadReceipts([]);
    setReceiptsLoading(false);
  }, []);

  return {
    reminders,
    loading,
    loadError,
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

const resolveSaveResultMessage = (
  formReminder: Reminder | null,
  result: ReminderSaveResult
): string => {
  if (result === 'saved_with_image') {
    return formReminder
      ? 'El aviso fue actualizado con su imagen.'
      : 'El aviso fue creado con su imagen.';
  }

  if (result === 'permission_denied_image_upload') {
    return formReminder
      ? 'El aviso fue actualizado, pero la imagen no pudo subirse.'
      : 'El aviso fue creado, pero la imagen no pudo subirse.';
  }
  return formReminder ? 'El aviso fue actualizado.' : 'El aviso fue creado.';
};
