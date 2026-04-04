import {
  buildJsonResponse,
  buildCorsHeaders,
  getRequestOrigin,
  type NetlifyEventLike,
} from './lib/http';

const MMRAD_BASE_URL = 'https://ris.mmrad.cl';

interface MMRADExam {
  nombre_examen: string;
  fecha_examen: string;
  fecha_asignacion: string;
  mod: string;
  estado: string;
  pdf_url: string | null;
  dicom_url: string | null;
}

const getCredentials = () => ({
  username: process.env.MMRAD_USERNAME || 'vsalfate',
  password: process.env.MMRAD_PASSWORD || 'balooh',
});

/**
 * Accumulate all Set-Cookie headers from a Response.
 * Node's Headers.forEach only returns the LAST value for repeated headers,
 * so we use the non-standard getSetCookie() when available.
 */
const collectSetCookies = (response: Response): string[] => {
  // Node 18+ supports getSetCookie()
  if (
    'getSetCookie' in response.headers &&
    typeof (response.headers as any).getSetCookie === 'function'
  ) {
    return (response.headers as any).getSetCookie() as string[];
  }
  // Fallback: try raw headers
  const raw = (response.headers as any).raw?.();
  if (raw?.['set-cookie']) {
    return raw['set-cookie'] as string[];
  }
  // Last resort: single header
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
};

const mergeCookies = (existing: string, newSetCookies: string[]): string => {
  const cookieMap = new Map<string, string>();
  // Parse existing
  for (const part of existing.split('; ')) {
    const [name] = part.split('=');
    if (name) cookieMap.set(name.trim(), part.trim());
  }
  // Parse new Set-Cookie values (take only the name=value part before ;)
  for (const setCookie of newSetCookies) {
    const nameValue = setCookie.split(';')[0]?.trim();
    if (nameValue) {
      const [name] = nameValue.split('=');
      if (name) cookieMap.set(name.trim(), nameValue);
    }
  }
  return Array.from(cookieMap.values()).join('; ');
};

/**
 * Login to MMRAD RIS and return accumulated session cookies.
 * The Liferay portal uses a multi-step login with redirects:
 * 1. GET the home page to establish a JSESSIONID
 * 2. POST login credentials
 * 3. Follow redirects to get the authenticated session
 */
const loginToMMRAD = async (): Promise<{ cookies: string; debug: string[] }> => {
  const { username, password } = getCredentials();
  const debug: string[] = [];
  let cookies = '';

  // Step 1: Get initial page and session cookie
  const step1 = await fetch(`${MMRAD_BASE_URL}/web/guest/home`, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  cookies = mergeCookies(cookies, collectSetCookies(step1));
  debug.push(`Step1: status=${step1.status}, cookies=${cookies.substring(0, 80)}...`);

  // Step 2: POST login form
  const loginBody = new URLSearchParams({
    _58_login: username,
    _58_password: password,
    _58_redirect: '/web/guest/home',
    _58_rememberMe: 'false',
  });

  const step2 = await fetch(`${MMRAD_BASE_URL}/c/portal/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Cookie: cookies,
    },
    body: loginBody.toString(),
    redirect: 'manual',
  });
  cookies = mergeCookies(cookies, collectSetCookies(step2));
  debug.push(`Step2: status=${step2.status}, location=${step2.headers.get('location') || 'none'}`);

  // Step 3: Follow redirect if any (Liferay often redirects after login)
  const redirectUrl = step2.headers.get('location');
  if (redirectUrl) {
    const fullUrl = redirectUrl.startsWith('http')
      ? redirectUrl
      : `${MMRAD_BASE_URL}${redirectUrl}`;
    const step3 = await fetch(fullUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Cookie: cookies,
      },
    });
    cookies = mergeCookies(cookies, collectSetCookies(step3));
    debug.push(`Step3: status=${step3.status}`);

    // Sometimes there's a second redirect
    const redirect2 = step3.headers.get('location');
    if (redirect2) {
      const fullUrl2 = redirect2.startsWith('http') ? redirect2 : `${MMRAD_BASE_URL}${redirect2}`;
      const step4 = await fetch(fullUrl2, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Cookie: cookies,
        },
      });
      cookies = mergeCookies(cookies, collectSetCookies(step4));
      debug.push(`Step4: status=${step4.status}`);
    }
  }

  return { cookies, debug };
};

/**
 * Search for patient exams using the authenticated session.
 * The search form POSTs to the same page with the patient RUT.
 */
const searchExams = async (
  rut: string,
  cookies: string
): Promise<{ exams: MMRADExam[]; htmlLength: number; debug: string }> => {
  // The search uses a form POST with the patient ID field
  const searchBody = new URLSearchParams({
    idpaciente: rut,
  });

  const response = await fetch(`${MMRAD_BASE_URL}/web/guest/home`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Cookie: cookies,
      Referer: `${MMRAD_BASE_URL}/web/guest/home`,
    },
    body: searchBody.toString(),
  });

  const html = await response.text();
  const exams = parseExamsFromHTML(html);

  // Debug: check if we got a login page back (means auth failed)
  const isLoginPage = html.includes('_58_password') || html.includes('Acceder');
  const hasSearchInput = html.includes('idpaciente');
  const debugInfo = `htmlLen=${html.length}, isLoginPage=${isLoginPage}, hasSearchInput=${hasSearchInput}, rows=${exams.length}`;

  return { exams, htmlLength: html.length, debug: debugInfo };
};

const parseExamsFromHTML = (html: string): MMRADExam[] => {
  const exams: MMRADExam[] = [];

  // Find table rows - use a more greedy pattern since Liferay HTML can be deeply nested
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!rowHtml || !rowHtml.includes('Acciones')) continue;

    // Extract all TD contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const text = tdMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      tds.push(text);
    }

    if (tds.length < 10) continue;

    // Extract PDF link
    const pdfMatch = rowHtml.match(/href="([^"]*informePDF[^"]*)"/i);
    let pdfUrl: string | null = pdfMatch ? pdfMatch[1] : null;
    if (pdfUrl && pdfUrl.startsWith('/')) {
      pdfUrl = MMRAD_BASE_URL + pdfUrl;
    }

    // Extract DICOM viewer link
    const dicomMatch = rowHtml.match(/window\.open\('([^']+)'/);
    let dicomUrl: string | null = dicomMatch ? dicomMatch[1] : null;
    if (dicomUrl && dicomUrl.startsWith('/')) {
      dicomUrl = MMRAD_BASE_URL + dicomUrl;
    }

    exams.push({
      nombre_examen: tds[10] || '',
      fecha_examen: tds[7] || '',
      fecha_asignacion: tds[6] || '',
      mod: tds[11] || '',
      estado: tds[13] || '',
      pdf_url: pdfUrl,
      dicom_url: dicomUrl,
    });
  }

  return exams;
};

export const handler = async (event: NetlifyEventLike) => {
  const requestOrigin = getRequestOrigin(event);
  const corsHeaders = buildCorsHeaders(requestOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return buildJsonResponse(405, { error: 'Method not allowed' }, { requestOrigin });
  }

  const rut = new URLSearchParams(event.rawQuery || '').get('rut');
  if (!rut) {
    return buildJsonResponse(400, { error: 'RUT es requerido' }, { requestOrigin });
  }

  const cleanRut = rut.replace(/\./g, '').trim();

  try {
    const { cookies, debug: loginDebug } = await loginToMMRAD();
    const { exams, debug: searchDebug } = await searchExams(cleanRut, cookies);

    return buildJsonResponse(
      200,
      {
        rut: cleanRut,
        examenes: exams,
        _debug: { login: loginDebug, search: searchDebug },
      },
      { requestOrigin }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return buildJsonResponse(500, { error: message }, { requestOrigin });
  }
};
