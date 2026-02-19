export interface CensusEmailRuntimePolicyInput {
  isDevelopment: boolean;
  allowDevEmailSendRaw?: string;
  endpointRaw?: string;
}

export interface CensusEmailRuntimePolicy {
  endpoint: string;
  allowDevelopmentEmailSend: boolean;
}

export const DEFAULT_CENSUS_EMAIL_ENDPOINT = '/.netlify/functions/send-census-email';

export const resolveCensusEmailRuntimePolicy = ({
  isDevelopment,
  allowDevEmailSendRaw,
  endpointRaw,
}: CensusEmailRuntimePolicyInput): CensusEmailRuntimePolicy => {
  const endpoint = endpointRaw?.trim() || DEFAULT_CENSUS_EMAIL_ENDPOINT;
  const allowDevelopmentEmailSend =
    isDevelopment && String(allowDevEmailSendRaw || '').toLowerCase() === 'true';

  return {
    endpoint,
    allowDevelopmentEmailSend,
  };
};

export const getDevelopmentSendDisabledMessage = (): string =>
  'El envio de correo esta deshabilitado en desarrollo local. ' +
  'Si necesitas probar el flujo real, ejecuta las funciones y define ' +
  'VITE_ALLOW_DEV_EMAIL_SEND=true (opcionalmente VITE_CENSUS_EMAIL_ENDPOINT).';
