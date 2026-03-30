import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DailyReportData, BuyerSummaryData } from './types';
import { formatDisplayDate, formatAmount } from './calculations';

const BRAND_COLOR: [number, number, number] = [0, 0, 0]; // black for print

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function getPageHeight(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

// Check if we need a new page; if so, add one and return the new Y position
function ensureSpace(doc: jsPDF, y: number, needed: number, marginBottom = 20): number {
  if (y + needed > getPageHeight(doc) - marginBottom) {
    doc.addPage();
    return 20; // top margin on new page
  }
  return y;
}

function addHeader(doc: jsPDF, title: string, subtitle: string, printFriendly = false) {
  const pageWidth = doc.internal.pageSize.getWidth();

  if (printFriendly) {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 3, 'F');

    doc.setTextColor(...BRAND_COLOR);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 16);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(subtitle, 14, 24);
  } else {
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 14);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(subtitle, 14, 22);
  }

  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const pageHeight = getPageHeight(doc);
    doc.text('Generated with Ginger Trading System', 14, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 42, pageHeight - 10);
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

  addHeader(doc, 'DAILY CONSOLIDATED REPORT', `Date: ${formatDisplayDate(data.date)}`, printFriendly);

  let y = 38;

  // Vehicles table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`Vehicles (${data.vehicles.length})`, 14, y);
  y += 5;

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
      headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 11 },
      bodyStyles: { fontSize: 11, textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
      rowPageBreak: 'avoid',
    });

    y = (doc as any).lastAutoTable.finalY + 12;
  } else {
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('No vehicles added', 14, y);
    y += 12;
  }

  // Buyers summary
  y = ensureSpace(doc, y, 30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Buyers Summary', 14, y);
  y += 7;

  if (data.vehicles.length > 0 && data.buyerSummaries.length > 0) {
    let overallTotalBags = 0;
    let overallTotalGross = 0;
    let overallTotalNet = 0;
    data.buyerSummaries.forEach((bs) => {
      bs.grades.forEach((g) => {
        overallTotalBags += g.totalBags;
        overallTotalGross += g.grossWeight;
        overallTotalNet += g.netWeight;
      });
    });

    data.vehicles.forEach((vehicle) => {
      // Ensure vehicle heading + at least one grade table fits
      y = ensureSpace(doc, y, 50);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Vehicle: ${vehicle.vehicleNumber}`, 14, y);
      y += 6;

      const sortedGrades = Object.entries(vehicle.gradeWiseBags).sort(([a], [b]) => a.localeCompare(b));

      sortedGrades.forEach(([grade, vehicleBagCount]) => {
        const buyersForGrade = data.buyerSummaries
          .map((bs) => {
            const gd = bs.grades.find((g) => g.grade === grade);
            if (!gd) return null;
            const rateStr = gd.rate != null ? String(gd.rate) : '';
            const amtStr = gd.amount != null ? formatAmount(gd.amount) : '';
            return [bs.buyer.name, String(gd.totalBags), `${gd.grossWeight} kg`, `${gd.netWeight} kg`, rateStr, amtStr];
          })
          .filter((row): row is string[] => row !== null);

        // Ensure grade heading + table fits on page
        y = ensureSpace(doc, y, 40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Grade ${grade} (${vehicleBagCount} bags from this vehicle)`, 20, y);
        y += 4;

        if (buyersForGrade.length > 0) {
          let gradeTotalBags = 0;
          let gradeTotalGross = 0;
          let gradeTotalNet = 0;
          let gradeTotalAmt = 0;
          buyersForGrade.forEach((row) => {
            gradeTotalBags += parseInt(row[1]);
            gradeTotalGross += parseInt(row[2]);
            gradeTotalNet += parseInt(row[3]);
            if (row[5]) gradeTotalAmt += parseFloat(row[5].replace(/[Rs.,]/g, '')) || 0;
          });
          const totalAmtStr = gradeTotalAmt > 0 ? formatAmount(gradeTotalAmt) : '';
          const bodyRows = [...buyersForGrade, ['TOTAL', String(gradeTotalBags), `${gradeTotalGross} kg`, `${gradeTotalNet} kg`, '', totalAmtStr]];

          autoTable(doc, {
            startY: y,
            head: [['Buyer', 'Bags', 'Gross', 'Net', 'Rate', 'Amount']],
            body: bodyRows,
            headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 10 },
            bodyStyles: { fontSize: 10, textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' },
            margin: { left: 20, right: 14 },
            rowPageBreak: 'avoid',
            didParseCell: (hookData) => {
              if (hookData.section === 'body' && hookData.row.index === bodyRows.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
              }
            },
          });

          y = (doc as any).lastAutoTable.finalY + 8;
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('No buyers for this grade', 24, y);
          y += 8;
        }
      });

      y += 3;
    });

    // Overall totals
    y = ensureSpace(doc, y, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTALS: Bags: ${overallTotalBags} | Gross: ${overallTotalGross} kg | Net: ${overallTotalNet} kg`, 14, y);
    y += 12;
  } else {
    y += 6;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('No buyer data', 14, y);
    y += 12;
  }

  // Inventory table
  y = ensureSpace(doc, y, 40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Inventory Summary', 14, y);
  y += 5;

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
      headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 11 },
      bodyStyles: { fontSize: 11, textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
      rowPageBreak: 'avoid',
    });
  }

  addFooter(doc);
  return doc;
}

export function generateBuyerSummaryPDF(data: BuyerSummaryData, printFriendly = false): jsPDF {
  const doc = new jsPDF();

  const subtitle = data.buyer.phone
    ? `${data.buyer.name} | Tel: ${data.buyer.phone} | Date: ${formatDisplayDate(data.date)}`
    : `${data.buyer.name} | Date: ${formatDisplayDate(data.date)}`;

  addHeader(doc, 'BUYER SUMMARY', subtitle, printFriendly);

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 14;
  const marginRight = 14;
  const usableWidth = pageWidth - marginLeft - marginRight;

  // Adaptive sizing based on total bag count
  const totalBags = data.grades.reduce((sum, g) => sum + g.bags.length, 0);
  const isCompact = totalBags > 100;
  const pillW = isCompact ? 12 : 15;
  const pillH = isCompact ? 11 : 15;
  const pillGap = isCompact ? 2 : 3;
  const pillFontSize = isCompact ? 7 : 9;
  const cellW = pillW + pillGap;
  const cellH = pillH + pillGap;
  const pillsPerRow = Math.floor(usableWidth / cellW);

  let y = 38;

  if (data.grades.length === 0) {
    doc.setFontSize(13);
    doc.text('No bags entered yet', marginLeft, y);
  } else {
    for (const gradeStat of data.grades) {
      const gradeColor = hexToRgb(gradeStat.color) || BRAND_COLOR;

      // Calculate how much space this grade section needs
      const totalPillRows = Math.ceil(gradeStat.bags.length / pillsPerRow) || 1;
      const gradeNeeded = 8 + totalPillRows * cellH + 15; // heading + pills + summary line
      y = ensureSpace(doc, y, gradeNeeded);

      // Grade heading with black bullet
      doc.setFillColor(0, 0, 0);
      doc.circle(marginLeft + 2, y - 1.5, 2, 'F');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Grade ${gradeStat.grade}`, marginLeft + 7, y);
      y += 6;

      // Draw bag weight pills in a grid
      doc.setFontSize(pillFontSize);
      doc.setFont('helvetica', 'bold');

      gradeStat.bags.forEach((bag, i) => {
        const col = i % pillsPerRow;
        const row = Math.floor(i / pillsPerRow);
        const x = marginLeft + col * cellW;
        const cellY = y + row * cellH;

        // Check if this row of pills would go off page
        if (cellY + pillH > getPageHeight(doc) - 20) {
          return;
        }

        if (printFriendly) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.5);
          doc.roundedRect(x, cellY, pillW, pillH, 2, 2, 'S');
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setFillColor(0, 0, 0);
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
      y += totalPillRows * cellH + 3;

      // Grade summary line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      let summaryLine = `Bags: ${gradeStat.totalBags}  |  Gross: ${gradeStat.grossWeight} kg  |  Net: ${gradeStat.netWeight} kg`;
      if (gradeStat.rate != null) {
        summaryLine += `  |  Rate: ${gradeStat.rate}`;
      }
      if (gradeStat.amount != null) {
        summaryLine += `  |  Amt: ${formatAmount(gradeStat.amount)}`;
      }
      doc.text(summaryLine, marginLeft, y);
      y += 10;
    }

    // Overall Summary divider
    y = ensureSpace(doc, y, 50);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft + 20, y - 2, pageWidth - marginRight - 20, y - 2);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const summaryTitle = 'OVERALL SUMMARY';
    const titleWidth = doc.getTextWidth(summaryTitle);
    doc.text(summaryTitle, (pageWidth - titleWidth) / 2, y + 3);
    y += 10;

    // Summary table
    const hasAnyRate = data.grades.some((g) => g.rate != null);
    const summaryRows = data.grades.map((g) => {
      const row = [
        `Grade ${g.grade}`,
        String(g.totalBags),
        `${g.grossWeight} kg`,
        `${g.netWeight} kg`,
      ];
      if (hasAnyRate) {
        row.push(g.rate != null ? String(g.rate) : '');
        row.push(g.amount != null ? formatAmount(g.amount) : '');
      }
      return row;
    });

    const totalBagsCount = data.grades.reduce((s, g) => s + g.totalBags, 0);
    const totalGross = data.grades.reduce((s, g) => s + g.grossWeight, 0);
    const totalNet = data.grades.reduce((s, g) => s + g.netWeight, 0);
    const totalAmt = data.grades.reduce((s, g) => s + (g.amount || 0), 0);
    const totalRow = ['TOTAL', String(totalBagsCount), `${totalGross} kg`, `${totalNet} kg`];
    if (hasAnyRate) {
      totalRow.push('');
      totalRow.push(totalAmt > 0 ? formatAmount(totalAmt) : '');
    }
    summaryRows.push(totalRow);

    const summaryHead = ['Grade', 'Bags', 'Gross Wt', 'Net Wt'];
    if (hasAnyRate) {
      summaryHead.push('Rate', 'Amount');
    }

    autoTable(doc, {
      startY: y,
      head: [summaryHead],
      body: summaryRows,
      headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 10 },
      bodyStyles: { fontSize: 10, textColor: [0, 0, 0] as [number, number, number], fontStyle: 'bold' },
      margin: { left: marginLeft, right: marginRight },
      rowPageBreak: 'avoid',
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
