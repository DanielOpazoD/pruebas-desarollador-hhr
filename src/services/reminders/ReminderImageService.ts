import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getStorageInstance } from '@/firebaseConfig';
import { getActiveHospitalId } from '@/constants/firestorePaths';
import { REMINDER_IMAGE_MAX_BYTES } from './reminderShared';

const sanitizeFileName = (name: string): string =>
  name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');

const buildReminderImagePath = (reminderId: string, filename: string): string =>
  `reminders/${getActiveHospitalId()}/${reminderId}/${sanitizeFileName(filename)}`;

export const ReminderImageService = {
  async uploadImage(
    reminderId: string,
    file: File
  ): Promise<{ imageUrl: string; imagePath: string }> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imágenes PNG, JPG o WEBP.');
    }
    if (file.size > REMINDER_IMAGE_MAX_BYTES) {
      throw new Error('La imagen supera el límite de 2MB.');
    }

    const storage = await getStorageInstance();
    const imagePath = buildReminderImagePath(reminderId, file.name);
    const storageRef = ref(storage, imagePath);
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        module: 'reminders',
        reminderId,
      },
    });
    const imageUrl = await getDownloadURL(storageRef);
    return { imageUrl, imagePath };
  },

  async deleteImage(imagePath?: string): Promise<void> {
    if (!imagePath) return;
    const storage = await getStorageInstance();
    await deleteObject(ref(storage, imagePath));
  },
};
