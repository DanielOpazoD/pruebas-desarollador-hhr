import { getFirebaseServer } from './lib/firebase-server';
import { type NetlifyEventLike } from './lib/http';
import { collection, query, where, getDocs, setDoc, doc, Timestamp, arrayUnion, updateDoc, getDoc } from 'firebase/firestore';

// Función auxiliar para crear respuesta de Twilio (TwiML)
const buildTwinmlResponse = (message: string) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>${message}</Message>
</Response>`;
};

export const handler = async (event: NetlifyEventLike) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Twilio envia los datos como application/x-www-form-urlencoded base64 encoded by default in Netlify 
    // We need to decode it if it's base64, Netlify sets isBase64Encoded boolean
    let bodyText = event.body || '';
    if (event.isBase64Encoded) {
      bodyText = Buffer.from(bodyText, 'base64').toString('utf-8');
    }

    const bodyParams = new URLSearchParams(bodyText);
    const fromNumber = bodyParams.get('From'); // ej: "whatsapp:+56912345678"
    const messageBody = bodyParams.get('Body')?.trim() || '';

    if (!fromNumber) {
      return { statusCode: 400, body: 'Missing From parameter' };
    }

    // Extraer número limpio sin el prefijo de whatsapp
    const cleanNumber = fromNumber.replace('whatsapp:', '');

    const { db } = getFirebaseServer();

    // 1. AUTORIZACIÓN: Verificar si el número pertenece a un médico autorizado
    // Buscamos en una colección hipotética "usuarios_autorizados" (A reemplazar por la colección real de Profiles/Doctors si existe)
    const authRef = collection(db, 'usuarios_autorizados');
    const qAuth = query(authRef, where('celular', '==', cleanNumber));
    const authSnapshot = await getDocs(qAuth);

    if (authSnapshot.empty) {
      // Ignorar o avisar que no está autorizado
      const noAuthMessage = `Su número (${cleanNumber}) no se encuentra autorizado en el sistema clínico.`;
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/xml' },
        body: buildTwinmlResponse(noAuthMessage),
      };
    }

    const medico = authSnapshot.docs[0].data();
    const medicoId = authSnapshot.docs[0].id;

    // TODO: Implementar la máquina de estados 
    // Por ahora, solo haremos un eco de confirmación
    const responseMessage = `Hola Dr/Dra ${medico.nombre}, he recibido su mensaje: "${messageBody}". Pronto procesaré entregas de turno.`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/xml' },
      body: buildTwinmlResponse(responseMessage),
    };
  } catch (error) {
    console.error('Error in Twilio Webhook', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/xml' },
      body: buildTwinmlResponse('Error interno del servidor.'),
    };
  }
};
