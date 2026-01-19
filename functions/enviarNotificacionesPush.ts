import { createClientFromRequest } from "npm:@base44/sdk@0.8.6";
import {
	format,
	parseISO,
	differenceInMinutes,
	addMinutes,
} from "npm:date-fns@3.6.0";

Deno.serve(async (req) => {
	try {
		const errors = [];
		console.log("🚀 Iniciando envío de notificaciones push...");
		const base44 = createClientFromRequest(req);

		const today = format(new Date(), "yyyy-MM-dd");
		console.log(`📅 Fecha de hoy: ${today}`);

		const recordatorios =
			await base44.asServiceRole.entities.RecordatorioCancha.filter(
				{
					fecha: today,
					estado: "pendiente",
					notificar: true,
				},
			);
		console.log(
			`📋 Recordatorios encontrados: ${recordatorios.length}`,
		);

		const usuarios =
			await base44.asServiceRole.entities.User.list();
		console.log(`👥 Usuarios totales: ${usuarios.length}`);

		const turnos =
			await base44.asServiceRole.entities.TurnoCancha.filter({
				fecha: today,
			});
		console.log(`📅 Turnos de hoy: ${turnos.length}`);

		const now = new Date();
		console.log(`⏰ Hora actual: ${format(now, "HH:mm:ss")}`);
		let notificacionesEnviadas = 0;

		// Obtener credenciales de Firebase con validación
		const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
		const privateKeyRaw = Deno.env.get("FIREBASE_PRIVATE_KEY");
		const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");

		console.log(`🔍 Verificando credenciales de Firebase...`);
		console.log(`   Project ID: ${projectId ? "✅ presente" : "❌ faltante"}`);
		console.log(`   Private Key: ${privateKeyRaw ? "✅ presente" : "❌ faltante"}`);
		console.log(`   Client Email: ${clientEmail ? "✅ presente" : "❌ faltante"}`);

		if (!projectId || !privateKeyRaw || !clientEmail) {
			console.error("❌ Faltan credenciales de Firebase");
			return Response.json(
				{
					error: "Credenciales de Firebase no configuradas correctamente",
					missing: {
						projectId: !projectId,
						privateKey: !privateKeyRaw,
						clientEmail: !clientEmail,
					},
				},
				{ status: 500 },
			);
		}

		// Procesar la clave privada
		const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
		console.log(`✅ Credenciales validadas correctamente`);

		console.log(`🔑 Obteniendo access token de Firebase...`);
		const accessToken = await getAccessToken(
			clientEmail,
			privateKey,
		);
		console.log(`✅ Access token obtenido`);

		for (const rec of recordatorios) {
			console.log(
				`\n🔔 Procesando recordatorio: Cancha ${rec.cancha} - ${rec.hora} (${rec.cliente || rec.profesor})`,
			);
			console.log(
				`   Fecha: ${rec.fecha}, Estado: ${rec.estado}, Notificado previo: ${rec.notificado_previo}`,
			);

			const [hours, minutes] = rec.hora
				.split(":")
				.map(Number);
			const recordatorioTime = new Date();
			recordatorioTime.setHours(hours, minutes, 0, 0);

			const minutosAntes = rec.minutos_antes || 10;

			for (const usuario of usuarios) {
				if (
					usuario.role === "admin" &&
					usuario.recibir_notificaciones_cancha ===
						false
				) {
					console.log(
						`   ⏭️ Saltando admin ${usuario.email} (notificaciones desactivadas)`,
					);
					continue;
				}

				if (!usuario.push_subscription) {
					console.log(
						`   ⏭️ Saltando ${usuario.email} (sin push_subscription)`,
					);
					continue;
				}

				console.log(
					`   👤 Evaluando ${usuario.email} (${usuario.role})`,
				);

				let debeNotificar = false;
				let title, body, tag, url;

				if (usuario.role === "admin") {
					const turno = turnos.find(
						(t) =>
							t.id ===
							rec.turno_cancha_id,
					);
					const duracion = turno?.duracion || 60;
					const finTurno = addMinutes(
						recordatorioTime,
						duracion,
					);
					const minutesUntilEnd =
						differenceInMinutes(
							finTurno,
							now,
						);
					console.log(
						`      Admin: minutos hasta fin del turno = ${minutesUntilEnd}, umbral = ${minutosAntes}`,
					);

					if (
						minutesUntilEnd <=
							minutosAntes &&
						minutesUntilEnd >
							minutosAntes - 2 &&
						!rec.notificado_previo
					) {
						debeNotificar = true;
						title = `🧹 Preparar Cancha ${rec.cancha}`;
						body = `En ${minutosAntes} min (${rec.hora}). ${rec.cliente || rec.profesor}`;
						tag = `cancha-admin-${rec.id}`;
						url =
							"/RecordatoriosCanchaAdmin";

						await base44.asServiceRole.entities.RecordatorioCancha.update(
							rec.id,
							{
								notificado_previo: true,
							},
						);
					}
				} else {
					const minutesUntilStart =
						differenceInMinutes(
							recordatorioTime,
							now,
						);
					console.log(
						`      Empleado: minutos hasta inicio = ${minutesUntilStart}, umbral = ${minutosAntes}`,
					);

					if (
						minutesUntilStart <=
							minutosAntes &&
						minutesUntilStart >
							minutosAntes - 2 &&
						!rec.notificado_previo
					) {
						debeNotificar = true;
						title = `🧹 Sacar cancha ${rec.cancha}`;
						body = `En ${minutosAntes} min (${rec.hora}). Tocá para confirmar.`;
						tag = `cancha-empleado-${rec.id}`;
						url =
							"/RecordatoriosCanchaEmpleado";

						await base44.asServiceRole.entities.RecordatorioCancha.update(
							rec.id,
							{
								notificado_previo: true,
							},
						);
					}
				}

				if (debeNotificar) {
					console.log(`      ✅ DEBE NOTIFICAR`);
					console.log(
						`      📤 Enviando a ${usuario.email}: "${title}" - "${body}"`,
					);
					console.log(
						`      🔑 Token: ${usuario.push_subscription.substring(0, 20)}...`,
					);
					try {
						const response = await fetch(
							`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
							{
								method: "POST",
								headers: {
									Authorization: `Bearer ${accessToken}`,
									"Content-Type":
										"application/json",
								},
								body: JSON.stringify(
									{
										message: {
											token: usuario.push_subscription,
											notification:
												{
													title,
													body,
												},
											data: {
												tag,
												url,
												requireInteraction:
													"false",
											},
											webpush: {
												notification:
													{
														icon: "/icon-192x192.png",
														badge: "/badge-72x72.png",
													},
											},
										},
									},
								),
							},
						);

						if (response.ok) {
							const responseData =
								await response.json();
							console.log(
								`      ✅ Notificación enviada exitosamente a ${usuario.email}`,
							);
							console.log(
								`      Response:`,
								responseData,
							);
							notificacionesEnviadas++;
						} else {
							const error =
								await response.text();
							errors.push(error);
						}
					} catch (error) {
						console.error(
							`      ❌ Error enviando a ${usuario.email}:`,
							error.message,
						);
						console.error(
							`      Stack:`,
							error.stack,
						);
					}
				} else {
					console.log(
						`      ⏭️ No debe notificar en este momento`,
					);
				}
			}
		}

		console.log(`\n📊 ═══════════════════════════════════════`);
		console.log(`   RESUMEN FINAL`);
		console.log(
			`   ✅ Notificaciones enviadas: ${notificacionesEnviadas}`,
		);
		console.log(
			`   📋 Recordatorios revisados: ${recordatorios.length}`,
		);
		console.log(`   👥 Usuarios procesados: ${usuarios.length}`);
		console.log(`═══════════════════════════════════════\n`);

		return Response.json({
			success: true,
			notificacionesEnviadas,
			recordatoriosRevisados: recordatorios.length,
			errors: errors,
		});
	} catch (error) {
		console.error("❌ ERROR GENERAL:", error.message);
		console.error("Stack:", error.stack);
		return Response.json({ error: error.message }, { status: 500 });
	}
});

async function getAccessToken(clientEmail, privateKey) {
	const header = { alg: "RS256", typ: "JWT" };
	const now = Math.floor(Date.now() / 1000);
	const claim = {
		iss: clientEmail,
		scope: "https://www.googleapis.com/auth/firebase.messaging",
		aud: "https://oauth2.googleapis.com/token",
		exp: now + 3600,
		iat: now,
	};

	const encodedHeader = base64UrlEncode(JSON.stringify(header));
	const encodedClaim = base64UrlEncode(JSON.stringify(claim));
	const signatureInput = `${encodedHeader}.${encodedClaim}`;

	const key = await importPrivateKey(privateKey);
	const signature = await crypto.subtle.sign(
		"RSASSA-PKCS1-v1_5",
		key,
		new TextEncoder().encode(signatureInput),
	);

	const encodedSignature = base64UrlEncode(signature);
	const jwt = `${signatureInput}.${encodedSignature}`;

	const response = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
	});

	const data = await response.json();
	return data.access_token;
}

async function importPrivateKey(pem) {
	const pemContents = pem
		.replace("-----BEGIN PRIVATE KEY-----", "")
		.replace("-----END PRIVATE KEY-----", "")
		.replace(/\s/g, "");

	const binaryDer = Uint8Array.from(atob(pemContents), (c) =>
		c.charCodeAt(0),
	);

	return await crypto.subtle.importKey(
		"pkcs8",
		binaryDer,
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
}

function base64UrlEncode(data) {
	let base64;
	if (data instanceof ArrayBuffer) {
		base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
	} else {
		base64 = btoa(data);
	}
	return base64
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}