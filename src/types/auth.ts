/**
 * Authentication Types
 * Centralized type definitions for user authentication and authorization.
 */

import type { MedicalSpecialty } from './domain/dailyRecord';

/**
 * Available user roles in the application.
 * Controls access to different modules and features.
 */
export type UserRole =
  | 'viewer'
  | 'editor'
  | 'admin'
  | 'nurse_hospital'
  | 'doctor_urgency'
  | 'doctor_specialist'
  | 'viewer_census';

/**
 * User information structure used within the application's authentication state.
 */
export interface AuthUser {
  /** Unique Firebase User ID */
  uid: string;
  /** User's email address */
  email: string | null;
  /** User's display name (usually from Google) */
  displayName: string | null;
  /** URL to user's profile picture */
  photoURL?: string | null;
  /** User's role resolved from Gestión de Roles or bootstrap técnico */
  role?: UserRole;
  /** Optional specialty claims for scoping medical handoff tabs */
  medicalSpecialties?: MedicalSpecialty[];
}

export type AuthSessionStatus =
  | 'unauthenticated'
  | 'authenticating'
  | 'authorized'
  | 'anonymous_signature'
  | 'shared_census'
  | 'unauthorized'
  | 'auth_error';

export type AuthSessionSeverity = 'info' | 'warning' | 'error';

export interface AuthSessionError {
  message: string;
  code?: string;
  userSafeMessage?: string;
  retryable?: boolean;
  severity?: AuthSessionSeverity;
  technicalContext?: Record<string, unknown>;
  telemetryTags?: string[];
}

export type AuthSessionState =
  | {
      status: 'unauthenticated' | 'authenticating' | 'unauthorized';
      user: null;
      reason?: string;
      technicalContext?: Record<string, unknown>;
    }
  | {
      status: 'authorized' | 'anonymous_signature' | 'shared_census';
      user: AuthUser;
    }
  | {
      status: 'auth_error';
      user: null;
      error: AuthSessionError;
    };
