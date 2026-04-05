import { doc } from 'firebase/firestore';
import { PrintTemplateConfig } from '@/types/printTemplates';
import { COLLECTIONS, HOSPITAL_COLLECTIONS, getActiveHospitalId } from '@/constants/firestorePaths';
import { defaultRepositoryFirestoreRuntime } from '@/services/repositories/repositoryFirestoreRuntime';
import type { RepositoryFirestoreRuntimePort } from '@/services/repositories/ports/repositoryFirestoreRuntimePort';
import { printTemplateRepositoryLogger } from '@/services/repositories/repositoryLoggers';
import {
  readFirestoreDocument,
  saveFirestoreDocument,
  subscribeToFirestoreDocument,
} from '@/services/storage/firestore/firestoreDocumentStore';

export const createPrintTemplateRepository = (
  runtime: RepositoryFirestoreRuntimePort = defaultRepositoryFirestoreRuntime
) => {
  const getTemplateRef = (
    templateId: string,
    activeRuntime: Pick<RepositoryFirestoreRuntimePort, 'getDb'> = runtime
  ) =>
    doc(
      activeRuntime.getDb(),
      COLLECTIONS.HOSPITALS,
      getActiveHospitalId(),
      HOSPITAL_COLLECTIONS.PRINT_TEMPLATES,
      templateId
    );

  return {
    async getTemplate(templateId: string): Promise<PrintTemplateConfig | null> {
      try {
        return await readFirestoreDocument(runtime, activeRuntime =>
          getTemplateRef(templateId, activeRuntime)
        );
      } catch (error) {
        printTemplateRepositoryLogger.error(`Error fetching template ${templateId}`, error);
        return null;
      }
    },

    async saveTemplate(config: PrintTemplateConfig): Promise<void> {
      try {
        await saveFirestoreDocument(
          runtime,
          activeRuntime => getTemplateRef(config.id, activeRuntime),
          {
            ...config,
            lastUpdated: new Date().toISOString(),
          }
        );
      } catch (error) {
        printTemplateRepositoryLogger.error(`Error saving template ${config.id}`, error);
        throw error;
      }
    },

    subscribe(
      templateId: string,
      callback: (config: PrintTemplateConfig | null) => void
    ): () => void {
      return subscribeToFirestoreDocument({
        runtime,
        resolveRef: activeRuntime => getTemplateRef(templateId, activeRuntime),
        onData: callback,
        onError: error => {
          printTemplateRepositoryLogger.error(`Error subscribing to template ${templateId}`, error);
          callback(null);
        },
      });
    },
  };
};

export const PrintTemplateRepository = createPrintTemplateRepository();
