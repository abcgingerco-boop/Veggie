import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DailyReportData, BuyerSummaryData } from './types';

const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // indigo-500

function addHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 14, 20);

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text('Generated with Ginger Trading System', 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 40, pageHeight - 10);
  }
}

export function generateDailyReportPDF(data: DailyReportData): jsPDF {
  const doc = new jsPDF();

  addHeader(doc, 'DAILY CONSOLIDATED REPORT', `Date: ${data.date}`);

  let y = 36;

  // Vehicles table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Vehicles (${data.vehicles.length})`, 14, y);
  y += 4;

  if (data.vehicles.length > 0) {
    const vehicleRows = data.vehicles.flatMap((v) =>
      Object.entries(v.gradeWiseBags).map(([grade, count]) => [
        v.vehicleNumber,
        `Grade ${grade}`,
        String(count),
      ])
    );

    autoTable(doc, {
      startY: y,
      head: [['Vehicle', 'Grade', 'Bags']],
      body: vehicleRows,
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No vehicles added', 14, y);
    y += 10;
  }

  // Buyers summary table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Buyers Summary', 14, y);
  y += 4;

  if (data.buyerSummaries.length > 0) {
    const buyerRows = data.buyerSummaries.flatMap((bs) =>
      bs.grades.map((g) => [
        bs.buyer.name,
        `Grade ${g.grade}`,
        String(g.totalBags),
        `${g.grossWeight} kg`,
        `${g.netWeight} kg`,
      ])
    );

    autoTable(doc, {
      startY: y,
      head: [['Buyer', 'Grade', 'Bags', 'Gross', 'Net']],
      body: buyerRows,
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    y += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No buyer data', 14, y);
    y += 10;
  }

  // Inventory table
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventory Summary', 14, y);
  y += 4;

  if (data.inventory.length > 0) {
    const inventoryRows = data.inventory.map((inv) => [
      `Grade ${inv.grade}`,
      String(inv.totalBagsStart),
      String(inv.soldBags),
      String(inv.pendingBags),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Grade', 'Total', 'Sold', 'Pending']],
      body: inventoryRows,
      headStyles: { fillColor: BRAND_COLOR },
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  return doc;
}

export function generateBuyerSummaryPDF(data: BuyerSummaryData): jsPDF {
  const doc = new jsPDF();

  const subtitle = data.buyer.phone
    ? `${data.buyer.name} | Tel: ${data.buyer.phone} | Date: ${data.date}`
    : `${data.buyer.name} | Date: ${data.date}`;

  addHeader(doc, 'BUYER SUMMARY', subtitle);

  let y = 36;

  if (data.grades.length === 0) {
    doc.setFontSize(12);
    doc.text('No bags entered yet', 14, y);
  } else {
    for (const gradeStat of data.grades) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Grade ${gradeStat.grade}`, 14, y);
      y += 4;

      const bagRows = gradeStat.bags.map((bag) => [
        `#${bag.bagNumber}`,
        `${bag.weight} kg`,
      ]);

      bagRows.push(['Total Bags', String(gradeStat.totalBags)]);
      bagRows.push(['Gross Weight', `${gradeStat.grossWeight} kg`]);
      bagRows.push(['Net Weight', `${gradeStat.netWeight} kg`]);

      autoTable(doc, {
        startY: y,
        head: [['Bag', 'Weight']],
        body: bagRows,
        headStyles: { fillColor: BRAND_COLOR },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          // Bold the summary rows
          const rowCount = bagRows.length;
          if (data.section === 'body' && data.row.index >= rowCount - 3) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }
  }

  addFooter(doc);
  return doc;
}

export async function sharePDF(doc: jsPDF, title: string) {
  const blob = doc.output('blob');
  const file = new File([blob], `${title}.pdf`, { type: 'application/pdf' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch {
      // Fall through to save
    }
  }

  doc.save(`${title}.pdf`);
}
