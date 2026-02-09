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

    // Fetch turnos para el día
    const turnos = await base44.asServiceRole.entities.TurnoCancha.filter({ fecha });
    const filteredTurnos = selectedCancha !== 'todas' 
      ? turnos.filter(t => t.cancha === selectedCancha)
      : turnos;

    // Fetch clientes y cobros para obtener datos de pagos
    const clientes = await base44.asServiceRole.entities.Cliente.list();
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
      .map(turno => {
        const cliente = clientes.find(c => c.nombre === turno.cliente);
        const cobroCliente = cobrosClientes.find(c => 
          c.cliente_nombre === turno.cliente && 
          c.mes === fecha.substring(0, 7)
        );

        let estado = 'Pendiente';
        let estadoColor = [59, 130, 246]; // blue
        
        if (turno.pagado) {
          estado = '✓ Pagado';
          estadoColor = [34, 197, 94]; // green
        } else if (cliente?.activo === false) {
          estado = '✗ Moroso';
          estadoColor = [239, 68, 68]; // red
        }

        return [
          turno.hora_inicio,
          `${turno.hora_fin || ''}`,
          turno.cancha,
          turno.cliente || '-',
          turno.tipo_turno === 'clase' ? turno.profesor || '-' : 'Alquiler',
          `$${(turno.monto || 0).toLocaleString('es-AR')}`,
          estado,
          turno.notas || '-'
        ];
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

    // Pie de página
    const hoy = new Date();
    const horaGen = new Intl.DateTimeFormat('es-AR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(hoy);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generado: ${horaGen} | ${user.full_name || user.email}`, 14, pageHeight - 8);

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