import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';
import 'npm:jspdf-autotable@3.5.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fecha, selectedCancha } = body;

    if (!fecha) {
      return Response.json({ error: 'Fecha requerida' }, { status: 400 });
    }

    // Fetch turnos para el día (solo activos)
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({ fecha, estado: 'activo' });
    const filteredTurnos = selectedCancha !== 'todas' 
      ? turnos.filter(t => t.cancha === selectedCancha)
      : turnos;

    // Fetch clientes, alumnos y cobros para obtener datos de pagos
    const clientes = await base44.asServiceRole.entities.Cliente.list();
    const alumnos = await base44.asServiceRole.entities.Alumno.list();
    const cobrosClientes = await base44.asServiceRole.entities.CobroCliente.list();

    // Crear PDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colores
    const primaryColor = [16, 185, 129]; // emerald-600
    const textColor = [30, 30, 30];
    const headerBg = [241, 245, 249]; // slate-100
    const pagadoBg = [220, 252, 231]; // green-100
    const morosoBg = [254, 226, 226]; // red-100

    // Fecha formateada
    const fechaObj = new Date(fecha);
    const fechaFormato = new Intl.DateTimeFormat('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(fechaObj);

    // Header
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text('Planilla Diaria - Agenda de Canchas', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(...textColor);
    doc.text(`${fechaFormato.charAt(0).toUpperCase() + fechaFormato.slice(1)}`, pageWidth / 2, 22, { align: 'center' });

    if (selectedCancha !== 'todas') {
      doc.text(`Cancha ${selectedCancha}`, pageWidth / 2, 28, { align: 'center' });
    }

    // Tabla de turnos
    const tableData = filteredTurnos
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .flatMap(turno => {
        // Si es clase grupal con alumnos, crear una fila por alumno
         if (turno.tipo_turno === 'clase' && turno.alumnos_ids && turno.alumnos_ids.length > 0) {
           return turno.alumnos_ids.map((alumnoId, idx) => {
             const alumno = alumnos.find(a => a.id === alumnoId);
             const estado = turno.pagado ? '✓ Pagado' : '';

            return [
              turno.hora_inicio,
              `${turno.hora_fin || ''}`,
              turno.cancha,
              turno.alumnos_nombres?.[idx] || '-',
              turno.profesor || '-',
              `$${(alumno?.precio_mensual || 0).toLocaleString('es-AR')}`,
              estado,
              turno.notas || '-'
            ];
          });
        }

        // Para otros tipos (alquileres o clases sin alumnos)
        const cliente = clientes.find(c => c.nombre === turno.cliente);
        let estado = 'Pendiente';
        
        if (turno.pagado) {
          estado = '✓ Pagado';
        } else if (cliente?.activo === false) {
          estado = '✗ Moroso';
        }

        return [[
          turno.hora_inicio,
          `${turno.hora_fin || ''}`,
          turno.cancha,
          turno.cliente || '-',
          turno.tipo_turno === 'clase' ? turno.profesor || '-' : 'Alquiler',
          `$${(turno.monto || 0).toLocaleString('es-AR')}`,
          estado,
          turno.notas || '-'
        ]];
      });

    doc.autoTable({
      startY: 35,
      head: [['Inicio', 'Fin', 'Cancha', 'Cliente', 'Profesor/Tipo', 'Monto', 'Estado', 'Notas']],
      body: tableData,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 2.5,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 12 },
        1: { cellWidth: 12 },
        2: { cellWidth: 10 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16 },
        7: { cellWidth: 20 },
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // slate-50
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 6) {
          const cellValue = data.cell.text[0];
          if (cellValue.includes('Pagado')) {
            data.cell.styles.fillColor = pagadoBg;
            data.cell.styles.textColor = [22, 163, 74]; // green-700
          } else if (cellValue.includes('Moroso')) {
            data.cell.styles.fillColor = morosoBg;
            data.cell.styles.textColor = [220, 38, 38]; // red-700
          }
        }
      },
    });



    // Retornar PDF
    const pdfBytes = doc.output('arraybuffer');
    const filename = `Agenda_${fecha}_${selectedCancha !== 'todas' ? `Cancha${selectedCancha}` : 'TodasCanchas'}.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});