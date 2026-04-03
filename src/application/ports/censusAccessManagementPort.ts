import {
  addAuthorizedEmail,
  checkUserAccess,
  createInvitation,
  getAuthorizedEmails,
  registerUserFromInvitation,
  removeAuthorizedEmail,
  verifyInvitation,
} from '@/services/census/censusAccessService';
import type {
  CensusAccessInvitation,
  CensusAccessRole,
  CensusAccessUser,
  CensusAuthorizedEmail,
} from '@/types/censusAccess';

export interface CensusAccessManagementPort {
  createInvitation: (createdBy: string, role?: CensusAccessRole, email?: string) => Promise<string>;
  verifyInvitation: (invitationId: string) => Promise<CensusAccessInvitation | null>;
  registerUserFromInvitation: (
    invitationId: string,
    user: { uid: string; email: string; displayName: string }
  ) => Promise<boolean>;
  checkUserAccess: (userId: string) => Promise<CensusAccessUser | null>;
  getAuthorizedEmails: () => Promise<CensusAuthorizedEmail[]>;
  addAuthorizedEmail: (email: string, role: CensusAccessRole, addedBy: string) => Promise<void>;
  removeAuthorizedEmail: (email: string) => Promise<void>;
}

export const defaultCensusAccessManagementPort: CensusAccessManagementPort = {
  createInvitation: async (createdBy, role, email) => createInvitation(createdBy, role, email),
  verifyInvitation: async invitationId => verifyInvitation(invitationId),
  registerUserFromInvitation: async (invitationId, user) =>
    registerUserFromInvitation(invitationId, user),
  checkUserAccess: async userId => checkUserAccess(userId),
  getAuthorizedEmails: async () => getAuthorizedEmails(),
  addAuthorizedEmail: async (email, role, addedBy) => addAuthorizedEmail(email, role, addedBy),
  removeAuthorizedEmail: async email => removeAuthorizedEmail(email),
};
