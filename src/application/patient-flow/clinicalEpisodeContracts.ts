export interface PatientEpisodeContract {
  rut?: string;
  patientName?: string;
  admissionDate?: string;
  /** First day observed in census for the current episode, when available. */
  firstSeenDate?: string;
  admissionTime?: string;
  specialty?: string;
}
