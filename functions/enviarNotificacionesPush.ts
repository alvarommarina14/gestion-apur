import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { format, parseISO, differenceInMinutes, addMinutes } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const recordatorios = await base44.asServiceRole.entities.RecordatorioCancha.filter({
      fecha: today,
      estado: 'pendiente',
      notificar: true,
    });

    const usuarios = await base44.asServiceRole.entities.User.list();
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({ fecha: today });
    
    const now = new Date();
    let notificacionesEnviadas = 0;
    
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
    
    const accessToken = await getAccessToken(clientEmail, privateKey);
    
    for (const rec of recordatorios) {
      const [hours, minutes] = rec.hora.split(':').map(Number);
      const recordatorioTime = new Date();
      recordatorioTime.setHours(hours, minutes, 0, 0);

      const minutosAntes = rec.minutos_antes || 10;
      
      for (const usuario of usuarios) {
        if (usuario.role === 'admin' && usuario.recibir_notificaciones_cancha === false) {
          continue;
        }
        
        if (!usuario.push_subscription) continue;

        let debeNotificar = false;
        let title, body, tag, url;

        if (usuario.role === 'admin') {
          const turno = turnos.find(t => t.id === rec.turno_cancha_id);
          const duracion = turno?.duracion || 60;
          const finTurno = addMinutes(recordatorioTime, duracion);
          const minutesUntilEnd = differenceInMinutes(finTurno, now);

          if (minutesUntilEnd <= minutosAntes && minutesUntilEnd > (minutosAntes - 2) && !rec.notificado_previo) {
            debeNotificar = true;
            title = `🧹 Preparar Cancha ${rec.cancha}`;
            body = `En ${minutosAntes} min (${rec.hora}). ${rec.cliente || rec.profesor}`;
            tag = `cancha-admin-${rec.id}`;
            url = '/RecordatoriosCanchaAdmin';
            
            await base44.asServiceRole.entities.RecordatorioCancha.update(rec.id, {
              notificado_previo: true
            });
          }
        } else {
          const minutesUntilStart = differenceInMinutes(recordatorioTime, now);

          if (minutesUntilStart <= minutosAntes && minutesUntilStart > (minutosAntes - 2) && !rec.notificado_previo) {
            debeNotificar = true;
            title = `🧹 Sacar cancha ${rec.cancha}`;
            body = `En ${minutosAntes} min (${rec.hora}). Tocá para confirmar.`;
            tag = `cancha-empleado-${rec.id}`;
            url = '/RecordatoriosCanchaEmpleado';
            
            await base44.asServiceRole.entities.RecordatorioCancha.update(rec.id, {
              notificado_previo: true
            });
          }
        }

        if (debeNotificar) {
          try {
            const response = await fetch(
              `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  message: {
                    token: usuario.push_subscription,
                    notification: {
                      title,
                      body,
                    },
                    data: {
                      tag,
                      url,
                      requireInteraction: 'false',
                    },
                    webpush: {
                      notification: {
                        icon: '/icon-192x192.png',
                        badge: '/badge-72x72.png',
                      },
                    },
                  },
                }),
              }
            );

            if (response.ok) {
              notificacionesEnviadas++;
            } else {
              const error = await response.text();
              console.error('FCM error:', error);
            }
          } catch (error) {
            console.error('Error sending FCM notification:', error);
          }
        }
      }
    }
    
    return Response.json({ 
      success: true, 
      notificacionesEnviadas,
      recordatoriosRevisados: recordatorios.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function getAccessToken(clientEmail, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(signature);
  const jwt = `${signatureInput}.${encodedSignature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  return data.access_token;
}

async function importPrivateKey(pem) {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function base64UrlEncode(data) {
  let base64;
  if (data instanceof ArrayBuffer) {
    base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  } else {
    base64 = btoa(data);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}