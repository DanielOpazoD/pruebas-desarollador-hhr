export interface CensusEmailTransportRequest {
  endpoint: string;
  body: string;
  userEmail?: string | null;
  userRole?: string | null;
  signal: AbortSignal;
}

export const sendCensusEmailTransportRequest = async (
  request: CensusEmailTransportRequest,
  fetchImpl: typeof fetch
): Promise<Response> =>
  fetchImpl(request.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-email': request.userEmail || '',
      'x-user-role': request.userRole || '',
    },
    body: request.body,
    signal: request.signal,
  });
