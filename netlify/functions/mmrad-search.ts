import {
  buildJsonResponse,
  buildCorsHeaders,
  getRequestOrigin,
  type NetlifyEventLike,
} from './lib/http';

const MMRAD_BASE_URL = 'https://ris.mmrad.cl';
const MMRAD_LOGIN_URL = `${MMRAD_BASE_URL}/c/portal/login`;
const MMRAD_SEARCH_URL = `${MMRAD_BASE_URL}/web/guest/home`;

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

const extractCookies = (headers: Headers): string => {
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      const cookieName = value.split(';')[0];
      if (cookieName) cookies.push(cookieName);
    }
  });
  return cookies.join('; ');
};

const loginToMMRAD = async (): Promise<string> => {
  const { username, password } = getCredentials();

  // Step 1: Get initial session
  const initialResponse = await fetch(MMRAD_SEARCH_URL, { redirect: 'manual' });
  let cookies = extractCookies(initialResponse.headers);

  // Step 2: Login
  const loginBody = new URLSearchParams({
    _58_login: username,
    _58_password: password,
    _58_redirect: '/web/guest/home',
  });

  const loginResponse = await fetch(MMRAD_LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: loginBody.toString(),
    redirect: 'manual',
  });

  // Merge cookies from login response
  const loginCookies = extractCookies(loginResponse.headers);
  if (loginCookies) {
    cookies = loginCookies;
  }

  return cookies;
};

const searchExams = async (rut: string, cookies: string): Promise<MMRADExam[]> => {
  const searchBody = new URLSearchParams({ idpaciente: rut });

  const response = await fetch(MMRAD_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookies,
    },
    body: searchBody.toString(),
  });

  const html = await response.text();
  return parseExamsFromHTML(html);
};

const parseExamsFromHTML = (html: string): MMRADExam[] => {
  const exams: MMRADExam[] = [];

  // Find all table rows that contain "Acciones"
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    if (!rowHtml.includes('Acciones')) continue;

    // Extract all TD contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tds: string[] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags from TD content
      const text = tdMatch[1].replace(/<[^>]+>/g, '').trim();
      tds.push(text);
    }

    if (tds.length < 10) continue;

    // Extract PDF link
    const pdfMatch = rowHtml.match(/href="([^"]*informePDF[^"]*)"/i);
    let pdfUrl: string | null = pdfMatch ? pdfMatch[1] : null;
    if (pdfUrl && pdfUrl.startsWith('/')) {
      pdfUrl = MMRAD_BASE_URL + pdfUrl;
    }

    // Extract DICOM link
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
    const cookies = await loginToMMRAD();
    const examenes = await searchExams(cleanRut, cookies);

    return buildJsonResponse(200, { rut: cleanRut, examenes }, { requestOrigin });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return buildJsonResponse(500, { error: message }, { requestOrigin });
  }
};
