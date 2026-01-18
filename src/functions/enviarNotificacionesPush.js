import { base44 } from "@base44/sdk";
import webpush from "web-push";
import { format, parseISO, differenceInMinutes, addMinutes } from "date-fns";

export default async function enviarNotificacionesPush() {
        // Configurar VAPID
        webpush.setVapidDetails(
                `mailto:${process.env.VAPID_EMAIL}`,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY,
        );

        const today = format(new Date(), "yyyy-MM-dd");

        // Obtener recordatorios pendientes de hoy
        const recordatorios =
                await base44.asServiceRole.entities.RecordatorioCancha.filter({
                        fecha: today,
                        estado: "pendiente",
                        notificar: true,
                });

        // Obtener todos los usuarios con suscripciones
        const usuarios = await base44.asServiceRole.entities.User.list();

        const now = new Date();

        console.log("Recordatorios encontrados:", recordatorios);

        for (const rec of recordatorios) {
                const [hours, minutes] = rec.hora.split(":").map(Number);
                const recordatorioTime = new Date();
                recordatorioTime.setHours(hours, minutes, 0, 0);

                const minutosAntes = rec.minutos_antes || 10;

                for (const usuario of usuarios) {
                        // Verificar si debe recibir notificación
                        if (
                                usuario.role !== "admin" ||
                                usuario.recibir_notificaciones_cancha !== false
                        ) {
                                if (!usuario.push_subscription) continue;

                                let debeNotificar = false;
                                let title, body, tag;

                                if (usuario.role === "admin") {
                                        // Admin: notificar antes del fin
                                        const turnos =
                                                await base44.asServiceRole.entities.TurnoCancha.filter(
                                                        { fecha: today },
                                                );
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

                                                // Marcar como notificado
                                                await base44.asServiceRole.entities.RecordatorioCancha.update(
                                                        rec.id,
                                                        {
                                                                notificado_previo: true,
                                                        },
                                                );
                                        }
                                } else {
                                        // Empleado: notificar antes del inicio
                                        const minutesUntilStart =
                                                differenceInMinutes(
                                                        recordatorioTime,
                                                        now,
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

                                                await base44.asServiceRole.entities.RecordatorioCancha.update(
                                                        rec.id,
                                                        {
                                                                notificado_previo: true,
                                                        },
                                                );
                                        }
                                }

                                if (debeNotificar) {
                                        const payload = JSON.stringify({
                                                title,
                                                body,
                                                tag,
                                                requireInteraction: false,
                                                data: {
                                                        url:
                                                                usuario.role ===
                                                                "admin"
                                                                        ? "/RecordatoriosCanchaAdmin"
                                                                        : "/RecordatoriosCanchaEmpleado",
                                                },
                                        });

                                        try {
                                                console.log(
                                                        "Enviando notificación push:",
                                                        payload,
                                                );
                                                await webpush.sendNotification(
                                                        JSON.parse(
                                                                usuario.push_subscription,
                                                        ),
                                                        payload,
                                                );
                                        } catch (error) {
                                                console.error(
                                                        "Error sending push:",
                                                        error,
                                                );
                                        }
                                }
                        }
                }
        }

        return { success: true };
}
