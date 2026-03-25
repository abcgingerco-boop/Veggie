import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DailyReportData, BuyerSummaryData } from './types';
import { formatDisplayDate } from './calculations';

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

  addHeader(doc, 'DAILY CONSOLIDATED REPORT', `Date: ${formatDisplayDate(data.date)}`, printFriendly);

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

  // Buyers summary — Vehicle -> Grade -> Buyers
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Buyers Summary', 14, y);
  y += 6;

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
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`Vehicle: ${vehicle.vehicleNumber}`, 14, y);
      y += 5;

      const sortedGrades = Object.entries(vehicle.gradeWiseBags).sort(([a], [b]) => a.localeCompare(b));

      sortedGrades.forEach(([grade, vehicleBagCount]) => {
        const buyersForGrade = data.buyerSummaries
          .map((bs) => {
            const gd = bs.grades.find((g) => g.grade === grade);
            if (!gd) return null;
            const rateStr = gd.rate != null ? String(gd.rate) : '';
            const amtStr = gd.amount != null ? `₹${gd.amount.toLocaleString('en-IN')}` : '';
            return [bs.buyer.name, String(gd.totalBags), `${gd.grossWeight} kg`, `${gd.netWeight} kg`, rateStr, amtStr];
          })
          .filter((row): row is string[] => row !== null);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(194, 65, 12);
        doc.text(`Grade ${grade} (${vehicleBagCount} bags from this vehicle)`, 20, y);
        doc.setTextColor(0, 0, 0);
        y += 3;

        if (buyersForGrade.length > 0) {
          let gradeTotalBags = 0;
          let gradeTotalGross = 0;
          let gradeTotalNet = 0;
          let gradeTotalAmt = 0;
          buyersForGrade.forEach((row) => {
            gradeTotalBags += parseInt(row[1]);
            gradeTotalGross += parseInt(row[2]);
            gradeTotalNet += parseInt(row[3]);
            if (row[5]) gradeTotalAmt += parseFloat(row[5].replace(/[₹,]/g, '')) || 0;
          });
          const totalAmtStr = gradeTotalAmt > 0 ? `₹${gradeTotalAmt.toLocaleString('en-IN')}` : '';
          const bodyRows = [...buyersForGrade, ['TOTAL', String(gradeTotalBags), `${gradeTotalGross} kg`, `${gradeTotalNet} kg`, '', totalAmtStr]];

          autoTable(doc, {
            startY: y,
            head: [['Buyer', 'Bags', 'Gross', 'Net', 'Rate', 'Amount']],
            body: bodyRows,
            headStyles: { ...getTableHeadStyles(printFriendly), fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            margin: { left: 20, right: 14 },
            didParseCell: (hookData) => {
              if (hookData.section === 'body' && hookData.row.index === bodyRows.length - 1) {
                hookData.cell.styles.fontStyle = 'bold';
              }
            },
          });

          y = (doc as any).lastAutoTable.finalY + 6;
        } else {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text('No buyers for this grade', 24, y);
          y += 6;
        }
      });

      y += 2;
    });

    // Overall totals
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTALS: Bags: ${overallTotalBags} | Gross: ${overallTotalGross} kg | Net: ${overallTotalNet} kg`, 14, y);
    y += 10;
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
      let summaryLine = `Bags: ${gradeStat.totalBags}  |  Gross: ${gradeStat.grossWeight} kg  |  Net: ${gradeStat.netWeight} kg`;
      if (gradeStat.rate != null) {
        summaryLine += `  |  Rate: ${gradeStat.rate}`;
      }
      if (gradeStat.amount != null) {
        summaryLine += `  |  Amt: ₹${gradeStat.amount.toLocaleString('en-IN')}`;
      }
      doc.text(summaryLine, marginLeft, y);
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
        row.push(g.amount != null ? `₹${g.amount.toLocaleString('en-IN')}` : '');
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
      totalRow.push(totalAmt > 0 ? `₹${totalAmt.toLocaleString('en-IN')}` : '');
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
