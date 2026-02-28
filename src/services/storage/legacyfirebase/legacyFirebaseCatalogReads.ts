import { doc, getDoc } from 'firebase/firestore';

import { getLegacyDb } from './legacyFirebaseCore';

export const getCatalogFromPaths = async (paths: string[]): Promise<string[]> => {
  const db = getLegacyDb();
  if (!db) return [];

  for (const path of paths) {
    try {
      const docRef = doc(db, path);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) continue;
      const data = docSnap.data();
      const list = (data.list as string[]) || [];
      if (list.length > 0) {
        return list;
      }
    } catch {
      // Continue with next candidate path.
    }
  }

  return [];
};
