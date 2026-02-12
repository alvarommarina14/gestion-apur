import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fecha } = await req.json();
    
    // Obtener datos
    const turnos = await base44.entities.TurnoCancha.filter({ fecha });
    const bloqueos = await base44.entities.DisponibilidadCancha.filter({ 
      fecha_inicio: fecha,
      fecha_fin: fecha
    });
    const alumnos = await base44.entities.Alumno.list();
    const pagos = await base44.entities.Pago.list();
    const cobros = await base44.entities.CobroCliente.list();

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // ENCABEZADO
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('AGENDA DE CANCHAS - APUR', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    const fechaFormato = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(fechaFormato.charAt(0).toUpperCase() + fechaFormato.slice(1), pageWidth / 2, y, { align: 'center' });
    
    y += 6;
    doc.setFontSize(10);
    doc.text(`Total de turnos: ${turnos.length} turnos programados`, pageWidth / 2, y, { align: 'center' });
    
    y += 5;
    const ahora = new Date();
    doc.text(`Generado: ${ahora.toLocaleDateString('es-AR')} ${ahora.toLocaleTimeString('es-AR')}`, pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    doc.setDrawColor(200);
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    // TABLA DE HORARIOS
    const horarios = [];
    for (let i = 8; i < 22; i++) {
      horarios.push(`${i.toString().padStart(2, '0')}:00`);
      horarios.push(`${i.toString().padStart(2, '0')}:30`);
    }
    
    const canchas = ['1', '2', '3', '4'];
    const colWidth = 65;
    const rowHeight = 18;
    const startX = 10;
    
    // Encabezados
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, y, 20, 8, 'F');
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Hora', startX + 10, y + 5.5, { align: 'center' });
    
    canchas.forEach((cancha, idx) => {
      const x = startX + 20 + (idx * colWidth);
      doc.setFillColor(16, 185, 129);
      doc.rect(x, y, colWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`Cancha ${cancha}`, x + colWidth / 2, y + 5.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    });
    
    y += 8;

    // Organizar turnos por hora y cancha
    const turnosPorHora = {};
    horarios.forEach(hora => {
      turnosPorHora[hora] = { '1': null, '2': null, '3': null, '4': null };
    });

    turnos.forEach(turno => {
      if (turnosPorHora[turno.hora_inicio] && turnosPorHora[turno.hora_inicio][turno.cancha] === null) {
        turnosPorHora[turno.hora_inicio][turno.cancha] = turno;
      }
    });

    // Renderizar filas
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7);
    
    horarios.forEach((hora, idx) => {
      if (y > 180) {
        doc.addPage();
        y = 20;
      }

      // Columna de hora
      doc.rect(startX, y, 20, rowHeight);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(8);
      doc.text(hora, startX + 10, y + 9, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);

      // Columnas de canchas
      canchas.forEach((cancha, cIdx) => {
        const x = startX + 20 + (cIdx * colWidth);
        const turno = turnosPorHora[hora][cancha];
        const bloqueo = bloqueos.find(b => 
          (b.cancha === cancha || b.cancha === 'todas') &&
          hora >= b.hora_inicio && hora < b.hora_fin
        );

        doc.rect(x, y, colWidth, rowHeight);

        if (bloqueo) {
          doc.setFillColor(254, 202, 202);
          doc.rect(x + 1, y + 1, colWidth - 2, rowHeight - 2, 'F');
          doc.setTextColor(185, 28, 28);
          doc.setFont(undefined, 'bold');
          doc.text('🔴 BLOQUEADO', x + 2, y + 5);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(6);
          doc.text(bloqueo.motivo || '', x + 2, y + 9, { maxWidth: colWidth - 4 });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(7);
        } else if (turno) {
          let textY = y + 4;
          
          // Tipo de turno
          if (turno.tipo_turno === 'clase') {
            doc.setFillColor(219, 234, 254);
            doc.rect(x + 1, y + 1, colWidth - 2, rowHeight - 2, 'F');
            doc.setTextColor(37, 99, 235);
            doc.setFont(undefined, 'bold');
            doc.text('🔵 CLASE', x + 2, textY);
            textY += 3.5;
            
            // Verificar si es clase grupal
            const alumnosIds = turno.alumnos_ids || [];
            if (alumnosIds.length > 1) {
              doc.setFont(undefined, 'normal');
              doc.text(`Prof. ${turno.profesor || ''} | ${alumnosIds.length} alumnos`, x + 2, textY);
              textY += 3.5;
              doc.text(`${turno.hora_inicio}-${turno.hora_fin}`, x + 2, textY);
              textY += 4;
              
              // Mostrar cada alumno
              doc.setFontSize(6);
              alumnosIds.slice(0, 3).forEach((alumnoId, idx) => {
                const alumno = alumnos.find(a => a.id === alumnoId);
                if (alumno) {
                  const mesActual = fecha.substring(0, 7);
                  const pagosAlumno = pagos.filter(p => 
                    p.alumno_id === alumno.id && 
                    (p.mes_correspondiente === mesActual || p.fecha?.startsWith(mesActual))
                  );
                  const estadoPago = pagosAlumno.length > 0 ? '✓' : alumno.estado === 'moroso' ? '⚠️' : '(P)';
                  const monto = alumno.precio_mensual || 0;
                  doc.text(`• ${alumno.nombre} - $${monto.toLocaleString('es-AR')} ${estadoPago}`, x + 2, textY);
                  textY += 3;
                }
              });
              
              if (alumnosIds.length > 3) {
                doc.text(`... +${alumnosIds.length - 3} más`, x + 2, textY);
              }
            } else {
              // Clase individual
              doc.setFont(undefined, 'normal');
              const alumno = alumnos.find(a => a.id === alumnosIds[0]);
              if (alumno) {
                doc.text(`${alumno.nombre} - $${(alumno.precio_mensual || 0).toLocaleString('es-AR')}`, x + 2, textY);
                textY += 3.5;
                doc.text(`${turno.hora_inicio}-${turno.hora_fin}`, x + 2, textY);
                textY += 3.5;
                doc.text(`Prof. ${turno.profesor || ''}`, x + 2, textY);
                textY += 3.5;
                
                // Estado de pago
                const mesActual = fecha.substring(0, 7);
                const pagosAlumno = pagos.filter(p => 
                  p.alumno_id === alumno.id && 
                  (p.mes_correspondiente === mesActual || p.fecha?.startsWith(mesActual))
                );
                const estadoPago = pagosAlumno.length > 0 ? 'Pagado ✓' : alumno.estado === 'moroso' ? 'Moroso ⚠️' : 'Pendiente (P)';
                doc.setFont(undefined, 'bold');
                doc.text(estadoPago, x + 2, textY);
              }
            }
          } else {
            // Alquiler
            doc.setFillColor(220, 252, 231);
            doc.rect(x + 1, y + 1, colWidth - 2, rowHeight - 2, 'F');
            doc.setTextColor(5, 150, 105);
            doc.setFont(undefined, 'bold');
            doc.text(`🟢 ALQUILER - ${(turno.modalidad_alquiler || '').toUpperCase()}`, x + 2, textY);
            textY += 3.5;
            
            doc.setFont(undefined, 'normal');
            doc.text(`${turno.cliente} - $${(turno.monto || 0).toLocaleString('es-AR')}`, x + 2, textY);
            textY += 3.5;
            doc.text(`${turno.hora_inicio}-${turno.hora_fin}`, x + 2, textY);
            textY += 3.5;
            
            // Estado de pago
            const cobro = cobros.find(c => c.cliente_id === turno.cliente_id);
            const estadoPago = turno.pagado ? 'Pagado ✓' : cobro?.estado === 'moroso' ? 'Moroso ⚠️' : 'Pendiente (P)';
            doc.setFont(undefined, 'bold');
            doc.text(estadoPago, x + 2, textY);
          }
          
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setFillColor(248, 250, 252);
          doc.rect(x + 1, y + 1, colWidth - 2, rowHeight - 2, 'F');
          doc.setTextColor(148, 163, 184);
          doc.text('Disponible', x + colWidth / 2, y + 9, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        }
      });

      y += rowHeight;
    });

    // RESUMEN ESTADÍSTICO (nueva página)
    doc.addPage();
    y = 20;
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN ESTADÍSTICO', 15, y);
    y += 10;

    // Calcular estadísticas por cancha
    const estadsPorCancha = {};
    canchas.forEach(cancha => {
      const turnosCancha = turnos.filter(t => t.cancha === cancha);
      let totalEsperado = 0;
      let cobrado = 0;
      let pendiente = 0;
      let moroso = 0;

      turnosCancha.forEach(turno => {
        const monto = turno.monto || 0;
        totalEsperado += monto;
        
        if (turno.pagado) {
          cobrado += monto;
        } else {
          const cobro = cobros.find(c => c.cliente_id === turno.cliente_id);
          if (cobro?.estado === 'moroso') {
            moroso += monto;
          } else {
            pendiente += monto;
          }
        }
      });

      estadsPorCancha[cancha] = {
        turnos: turnosCancha.length,
        total: totalEsperado,
        cobrado,
        pendiente,
        moroso
      };
    });

    // Mostrar por cancha
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Por Cancha:', 15, y);
    y += 7;

    doc.setFontSize(9);
    canchas.forEach(cancha => {
      const stats = estadsPorCancha[cancha];
      doc.setFont(undefined, 'bold');
      doc.text(`Cancha ${cancha}:`, 20, y);
      doc.setFont(undefined, 'normal');
      doc.text(`${stats.turnos} turnos | $${stats.total.toLocaleString('es-AR')} total`, 45, y);
      y += 5;
      doc.setFontSize(8);
      doc.text(`  Cobrado: $${stats.cobrado.toLocaleString('es-AR')} | Pendiente: $${stats.pendiente.toLocaleString('es-AR')} | Moroso: $${stats.moroso.toLocaleString('es-AR')}`, 20, y);
      y += 6;
      doc.setFontSize(9);
    });

    // Resumen general
    y += 5;
    const totalTurnos = turnos.length;
    const totalEsperado = Object.values(estadsPorCancha).reduce((sum, s) => sum + s.total, 0);
    const totalCobrado = Object.values(estadsPorCancha).reduce((sum, s) => sum + s.cobrado, 0);
    const totalPendiente = Object.values(estadsPorCancha).reduce((sum, s) => sum + s.pendiente, 0);
    const totalMoroso = Object.values(estadsPorCancha).reduce((sum, s) => sum + s.moroso, 0);
    const ocupacion = Math.round((totalTurnos / (horarios.length * 4)) * 100);

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Resumen General:', 15, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(`🎾 Total turnos: ${totalTurnos}`, 20, y);
    y += 5;
    doc.text(`📊 Ocupación: ${ocupacion}% (${totalTurnos} de ${horarios.length * 4} slots disponibles)`, 20, y);
    y += 5;
    doc.text(`💰 Ingresos esperados: $${totalEsperado.toLocaleString('es-AR')}`, 20, y);
    y += 5;
    doc.text(`✅ Cobrados: $${totalCobrado.toLocaleString('es-AR')} (${Math.round((totalCobrado / totalEsperado) * 100)}%)`, 20, y);
    y += 5;
    doc.text(`⏳ Pendientes: $${totalPendiente.toLocaleString('es-AR')} (${Math.round((totalPendiente / totalEsperado) * 100)}%)`, 20, y);
    y += 5;
    doc.text(`⚠️ Morosos: $${totalMoroso.toLocaleString('es-AR')} (${Math.round((totalMoroso / totalEsperado) * 100)}%)`, 20, y);
    y += 10;

    // Desglose por tipo
    const clases = turnos.filter(t => t.tipo_turno === 'clase');
    const alquileresAbono = turnos.filter(t => t.tipo_turno === 'alquiler' && t.modalidad_alquiler === 'abono');
    const alquileresSueltos = turnos.filter(t => t.tipo_turno === 'alquiler' && t.modalidad_alquiler === 'suelto');

    doc.setFont(undefined, 'bold');
    doc.text('Desglose por Tipo:', 15, y);
    y += 7;
    doc.setFont(undefined, 'normal');
    doc.text(`Clases: ${clases.length} turnos | $${clases.reduce((sum, t) => sum + (t.monto || 0), 0).toLocaleString('es-AR')}`, 20, y);
    y += 5;
    doc.text(`Alquileres Abono: ${alquileresAbono.length} turnos | $${alquileresAbono.reduce((sum, t) => sum + (t.monto || 0), 0).toLocaleString('es-AR')}`, 20, y);
    y += 5;
    doc.text(`Alquileres Sueltos: ${alquileresSueltos.length} turnos | $${alquileresSueltos.reduce((sum, t) => sum + (t.monto || 0), 0).toLocaleString('es-AR')}`, 20, y);

    // Leyenda
    y += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Leyenda:', 15, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('🔵 Clase  |  🟢 Alquiler  |  🔴 Bloqueado', 20, y);
    y += 4;
    doc.text('✓ Pagado  |  (P) Pendiente  |  ⚠️ Moroso', 20, y);

    // Generar PDF
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=agenda-canchas-${fecha}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});