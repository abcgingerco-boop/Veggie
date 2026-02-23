import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DailyReportData, BuyerSummaryData } from './types';

const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // indigo-500

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function addHeader(doc: jsPDF, title: string, subtitle: string, printFriendly = false) {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (printFriendly) {
    // Thin colored top line + colored text on white background
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(...BRAND_COLOR);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(subtitle, 14, 22);
  } else {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 20);
  }

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

function getTableHeadStyles(printFriendly: boolean) {
  if (printFriendly) {
    return {
      fillColor: [255, 255, 255] as [number, number, number],
      textColor: BRAND_COLOR,
      lineColor: BRAND_COLOR,
      lineWidth: 0.5,
    };
  }
  return { fillColor: BRAND_COLOR };
}

export function generateDailyReportPDF(data: DailyReportData, printFriendly = false): jsPDF {
  const doc = new jsPDF();

  addHeader(doc, 'DAILY CONSOLIDATED REPORT', `Date: ${data.date}`, printFriendly);

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
      headStyles: getTableHeadStyles(printFriendly),
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
      headStyles: getTableHeadStyles(printFriendly),
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
      headStyles: getTableHeadStyles(printFriendly),
      margin: { left: 14, right: 14 },
    });
  }

  addFooter(doc);
  return doc;
}

export function generateBuyerSummaryPDF(data: BuyerSummaryData, printFriendly = false): jsPDF {
  const doc = new jsPDF();

  const subtitle = data.buyer.phone
    ? `${data.buyer.name} | Tel: ${data.buyer.phone} | Date: ${data.date}`
    : `${data.buyer.name} | Date: ${data.date}`;

  addHeader(doc, 'BUYER SUMMARY', subtitle, printFriendly);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const usableWidth = pageWidth - marginLeft - marginRight;

  // Adaptive sizing based on total bag count
  const totalBags = data.grades.reduce((sum, g) => sum + g.bags.length, 0);
  const isCompact = totalBags > 100;
  const pillW = isCompact ? 11 : 14;
  const pillH = isCompact ? 10 : 14;
  const pillGap = isCompact ? 2 : 3;
  const pillFontSize = isCompact ? 6.5 : 8;
  const cellW = pillW + pillGap;
  const cellH = pillH + pillGap;
  const pillsPerRow = Math.floor(usableWidth / cellW);

  let y = 36;

  if (data.grades.length === 0) {
    doc.setFontSize(12);
    doc.text('No bags entered yet', marginLeft, y);
  } else {
    for (const gradeStat of data.grades) {
      const gradeColor = hexToRgb(gradeStat.color) || BRAND_COLOR;

      // Grade heading with colored bullet
      doc.setFillColor(...gradeColor);
      doc.circle(marginLeft + 2, y - 1.5, 1.5, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...gradeColor);
      doc.text(`Grade ${gradeStat.grade}`, marginLeft + 6, y);
      y += 5;

      // Draw bag weight pills in a grid
      doc.setFontSize(pillFontSize);
      doc.setFont('helvetica', 'bold');

      gradeStat.bags.forEach((bag, i) => {
        const col = i % pillsPerRow;
        const row = Math.floor(i / pillsPerRow);
        const x = marginLeft + col * cellW;
        const cellY = y + row * cellH;

        if (printFriendly) {
          // Outlined rectangle with colored text
          doc.setDrawColor(...gradeColor);
          doc.setLineWidth(0.5);
          doc.roundedRect(x, cellY, pillW, pillH, 2, 2, 'S');
          doc.setTextColor(...gradeColor);
        } else {
          // Filled rounded rectangle with white text
          doc.setFillColor(...gradeColor);
          doc.roundedRect(x, cellY, pillW, pillH, 2, 2, 'F');
          doc.setTextColor(255, 255, 255);
        }

        const weightText = String(bag.weight);
        const textWidth = doc.getTextWidth(weightText);
        const textX = x + (pillW - textWidth) / 2;
        const textY = cellY + pillH / 2 + pillFontSize * 0.12;
        doc.text(weightText, textX, textY);
      });

      // Move past the pills grid
      const totalRows = Math.ceil(gradeStat.bags.length / pillsPerRow) || 1;
      y += totalRows * cellH + 2;

      // Grade summary line
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Bags: ${gradeStat.totalBags}  |  Gross: ${gradeStat.grossWeight} kg  |  Net: ${gradeStat.netWeight} kg`,
        marginLeft,
        y
      );
      y += 8;
    }

    // Overall Summary divider
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(marginLeft + 20, y - 2, pageWidth - marginRight - 20, y - 2);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const summaryTitle = 'OVERALL SUMMARY';
    const titleWidth = doc.getTextWidth(summaryTitle);
    doc.text(summaryTitle, (pageWidth - titleWidth) / 2, y + 2);
    y += 8;

    // Summary table
    const summaryRows = data.grades.map((g) => [
      `Grade ${g.grade}`,
      String(g.totalBags),
      `${g.grossWeight} kg`,
      `${g.netWeight} kg`,
    ]);

    const totalBagsCount = data.grades.reduce((s, g) => s + g.totalBags, 0);
    const totalGross = data.grades.reduce((s, g) => s + g.grossWeight, 0);
    const totalNet = data.grades.reduce((s, g) => s + g.netWeight, 0);
    summaryRows.push(['TOTAL', String(totalBagsCount), `${totalGross} kg`, `${totalNet} kg`]);

    autoTable(doc, {
      startY: y,
      head: [['Grade', 'Bags', 'Gross Wt', 'Net Wt']],
      body: summaryRows,
      headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: marginLeft, right: marginRight },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.row.index === summaryRows.length - 1) {
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });
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
