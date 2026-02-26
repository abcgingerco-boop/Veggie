import html2canvas from 'html2canvas';
import type { DailyReportData, BuyerSummaryData } from './types';
import { formatDisplayDate } from './calculations';

function buildReportHTML(data: DailyReportData): string {
  const displayDate = formatDisplayDate(data.date);

  const thStyle = `padding:8px 10px;border-bottom:2px solid #c2410c;background:#fff;color:#c2410c;font-weight:bold;font-size:13px;text-align:center;`;

  // Vehicles table rows
  let vehicleRows = '';
  if (data.vehicles.length > 0) {
    data.vehicles.forEach((v) => {
      Object.entries(v.gradeWiseBags).forEach(([grade, count]) => {
        vehicleRows += `<tr>
          <td style="padding:6px 10px;border:1px solid #d1d5db;">${v.vehicleNumber}</td>
          <td style="padding:6px 10px;border:1px solid #d1d5db;">Grade ${grade}</td>
          <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:center;">${count}</td>
        </tr>`;
      });
    });
  }

  // Calculate overall totals from buyer summaries
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

  // Build Vehicle -> Grade -> Buyers section
  let buyerSection = '';
  if (data.vehicles.length > 0 && data.buyerSummaries.length > 0) {
    data.vehicles.forEach((vehicle) => {
      buyerSection += `<div style="margin-bottom:16px;">`;
      buyerSection += `<div style="font-size:14px;font-weight:bold;color:#292524;margin-bottom:8px;padding:6px 10px;background:#f5f5f4;border-left:4px solid #c2410c;border-radius:2px;">Vehicle: ${vehicle.vehicleNumber}</div>`;

      const sortedGrades = Object.entries(vehicle.gradeWiseBags).sort(([a], [b]) => a.localeCompare(b));

      sortedGrades.forEach(([grade, vehicleBagCount]) => {
        // Find all buyers who bought this grade
        const buyersForGrade: { buyerName: string; totalBags: number; grossWeight: number; netWeight: number }[] = [];
        data.buyerSummaries.forEach((bs) => {
          const gradeData = bs.grades.find((g) => g.grade === grade);
          if (gradeData) {
            buyersForGrade.push({ buyerName: bs.buyer.name, totalBags: gradeData.totalBags, grossWeight: gradeData.grossWeight, netWeight: gradeData.netWeight });
          }
        });

        buyerSection += `<div style="margin-left:16px;margin-bottom:12px;">`;
        buyerSection += `<div style="font-size:13px;font-weight:bold;color:#c2410c;margin-bottom:6px;">Grade ${grade} (${vehicleBagCount} bags from this vehicle)</div>`;

        if (buyersForGrade.length > 0) {
          buyerSection += `<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
          buyerSection += `<thead><tr>
            <th style="${thStyle}">Buyer</th>
            <th style="${thStyle}">Bags</th>
            <th style="${thStyle}">Gross</th>
            <th style="${thStyle}">Net</th>
            <th style="${thStyle}">Rate</th>
            <th style="${thStyle}">Amount</th>
          </tr></thead><tbody>`;

          let gradeTotalBags = 0;
          let gradeTotalGross = 0;
          let gradeTotalNet = 0;

          buyersForGrade.forEach((entry) => {
            gradeTotalBags += entry.totalBags;
            gradeTotalGross += entry.grossWeight;
            gradeTotalNet += entry.netWeight;

            buyerSection += `<tr>
              <td style="padding:5px 8px;border:1px solid #d1d5db;">${entry.buyerName}</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${entry.totalBags}</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${entry.grossWeight} kg</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${entry.netWeight} kg</td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;"></td>
              <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;"></td>
            </tr>`;
          });

          // Grade totals row
          buyerSection += `<tr style="font-weight:bold;background:#f9fafb;">
            <td style="padding:5px 8px;border:1px solid #d1d5db;">TOTAL</td>
            <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${gradeTotalBags}</td>
            <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${gradeTotalGross} kg</td>
            <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;">${gradeTotalNet} kg</td>
            <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;"></td>
            <td style="padding:5px 8px;border:1px solid #d1d5db;text-align:center;"></td>
          </tr>`;

          buyerSection += `</tbody></table>`;
        } else {
          buyerSection += `<div style="font-size:12px;color:#9ca3af;padding:4px 8px;">No buyers for this grade</div>`;
        }

        buyerSection += `</div>`;
      });

      buyerSection += `</div>`;
    });

    // Overall totals bar
    buyerSection += `<div style="margin-top:8px;padding:8px 10px;background:#f5f5f4;border-radius:4px;font-size:13px;font-weight:bold;color:#292524;">
      TOTALS: Bags: ${overallTotalBags} | Gross: ${overallTotalGross} kg | Net: ${overallTotalNet} kg
    </div>`;
  }

  // Inventory rows
  let inventoryRows = '';
  if (data.inventory.length > 0) {
    data.inventory.forEach((inv) => {
      inventoryRows += `<tr>
        <td style="padding:6px 10px;border:1px solid #d1d5db;">Grade ${inv.grade}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:center;">${inv.totalBagsStart}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:center;">${inv.soldBags}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:center;">${inv.pendingBags}</td>
      </tr>`;
    });
  }

  return `
    <div style="width:800px;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1f2937;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #c2410c;">
        <div>
          <div style="font-size:28px;font-weight:bold;color:#c2410c;letter-spacing:1px;">ABC Ginger Co.</div>
          <div style="font-size:14px;color:#78716c;margin-top:4px;">Daily Consolidated Report</div>
        </div>
        <div style="margin-top:10px;font-size:16px;font-weight:bold;color:#292524;">Date: ${displayDate}</div>
      </div>

      <!-- Vehicles Table -->
      <div style="margin-bottom:20px;">
        <div style="font-size:16px;font-weight:bold;color:#c2410c;margin-bottom:8px;">Vehicles (${data.vehicles.length})</div>
        ${data.vehicles.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="${thStyle}">Vehicle</th>
              <th style="${thStyle}">Grade</th>
              <th style="${thStyle}">Bags</th>
            </tr>
          </thead>
          <tbody>${vehicleRows}</tbody>
        </table>` : '<div style="font-size:13px;color:#9ca3af;padding:8px;">No vehicles added</div>'}
      </div>

      <!-- Buyer Details (Vehicle -> Grade -> Buyers) -->
      <div style="margin-bottom:20px;">
        <div style="font-size:16px;font-weight:bold;color:#c2410c;margin-bottom:8px;">Buyers Summary</div>
        ${buyerSection || '<div style="font-size:13px;color:#9ca3af;padding:8px;">No buyer data</div>'}
      </div>

      <!-- Inventory Table -->
      <div style="margin-bottom:20px;">
        <div style="font-size:16px;font-weight:bold;color:#c2410c;margin-bottom:8px;">Inventory Summary</div>
        ${data.inventory.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="${thStyle}">Grade</th>
              <th style="${thStyle}">Total</th>
              <th style="${thStyle}">Sold</th>
              <th style="${thStyle}">Pending</th>
            </tr>
          </thead>
          <tbody>${inventoryRows}</tbody>
        </table>` : '<div style="font-size:13px;color:#9ca3af;padding:8px;">No inventory data</div>'}
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
        Generated with Ginger Trading System
      </div>
    </div>
  `;
}

export async function generateDailyReportImage(data: DailyReportData): Promise<Blob> {
  // Create a hidden container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = buildReportHTML(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        0.92
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

function buildBuyerReportHTML(data: BuyerSummaryData): string {
  const displayDate = formatDisplayDate(data.date);
  const thStyle = `padding:8px 10px;border-bottom:2px solid #c2410c;background:#fff;color:#c2410c;font-weight:bold;font-size:13px;text-align:center;`;
  const tdStyle = `padding:6px 10px;border:1px solid #d1d5db;`;

  // Grade details with bag pills
  let gradeDetails = '';
  const sortedGrades = [...data.grades].sort((a, b) => a.grade.localeCompare(b.grade));

  sortedGrades.forEach((gradeStat) => {
    const color = gradeStat.color || '#6366f1';
    let bagPills = '';
    gradeStat.bags.forEach((bag) => {
      bagPills += `<span style="display:inline-block;padding:4px 8px;margin:2px;border-radius:6px;background:${color};color:#fff;font-weight:bold;font-size:12px;">#${bag.bagNumber}: ${bag.weight}kg</span>`;
    });

    gradeDetails += `
      <div style="margin-bottom:16px;border:2px solid ${color};border-radius:8px;padding:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;">${gradeStat.grade}</div>
          <span style="font-size:15px;font-weight:bold;color:${color};">Grade ${gradeStat.grade}</span>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:8px;">
          <div style="text-align:center;padding:6px 12px;background:#eff6ff;border-radius:6px;border:1px solid #bfdbfe;">
            <div style="font-size:11px;color:#1d4ed8;font-weight:600;">Bags</div>
            <div style="font-size:18px;font-weight:800;color:#1e3a5f;">${gradeStat.totalBags}</div>
          </div>
          <div style="text-align:center;padding:6px 12px;background:#f5f3ff;border-radius:6px;border:1px solid #c4b5fd;">
            <div style="font-size:11px;color:#7c3aed;font-weight:600;">Gross</div>
            <div style="font-size:18px;font-weight:800;color:#4c1d95;">${gradeStat.grossWeight} kg</div>
          </div>
          <div style="text-align:center;padding:6px 12px;background:${color}15;border-radius:6px;border:2px solid ${color};">
            <div style="font-size:11px;color:${color};font-weight:700;">Net</div>
            <div style="font-size:18px;font-weight:900;color:${color};">${gradeStat.netWeight} kg</div>
          </div>
        </div>
        <div style="background:#f9fafb;border-radius:6px;padding:8px;">
          ${bagPills}
        </div>
      </div>
    `;
  });

  // Summary table
  let summaryRows = '';
  let totalBags = 0, totalGross = 0, totalNet = 0;
  sortedGrades.forEach((g) => {
    totalBags += g.totalBags;
    totalGross += g.grossWeight;
    totalNet += g.netWeight;
    summaryRows += `<tr>
      <td style="${tdStyle}">Grade ${g.grade}</td>
      <td style="${tdStyle}text-align:center;">${g.totalBags}</td>
      <td style="${tdStyle}text-align:center;">${g.grossWeight} kg</td>
      <td style="${tdStyle}text-align:center;">${g.netWeight} kg</td>
    </tr>`;
  });
  summaryRows += `<tr>
    <td style="${tdStyle}font-weight:bold;">TOTAL</td>
    <td style="${tdStyle}text-align:center;font-weight:bold;">${totalBags}</td>
    <td style="${tdStyle}text-align:center;font-weight:bold;">${totalGross} kg</td>
    <td style="${tdStyle}text-align:center;font-weight:bold;">${totalNet} kg</td>
  </tr>`;

  const phoneInfo = data.buyer.phone ? `<div style="font-size:13px;color:#78716c;">Tel: ${data.buyer.phone}</div>` : '';

  return `
    <div style="width:800px;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1f2937;">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #c2410c;">
        <div>
          <div style="font-size:28px;font-weight:bold;color:#c2410c;letter-spacing:1px;">ABC Ginger Co.</div>
          <div style="font-size:14px;color:#78716c;margin-top:4px;">Buyer Summary</div>
        </div>
        <div style="margin-top:10px;">
          <div style="font-size:18px;font-weight:bold;color:#292524;">${data.buyer.name}</div>
          ${phoneInfo}
          <div style="font-size:14px;color:#57534e;margin-top:2px;">Date: ${displayDate}</div>
        </div>
      </div>

      <!-- Grade Details -->
      ${gradeDetails}

      <!-- Overall Summary -->
      <div style="margin-top:20px;">
        <div style="font-size:16px;font-weight:bold;color:#c2410c;margin-bottom:8px;text-align:center;">OVERALL SUMMARY</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="${thStyle}">Grade</th>
              <th style="${thStyle}">Bags</th>
              <th style="${thStyle}">Gross Wt</th>
              <th style="${thStyle}">Net Wt</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>

      <!-- Footer -->
      <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:16px;padding-top:12px;border-top:1px solid #e5e7eb;">
        Generated with Ginger Trading System
      </div>
    </div>
  `;
}

export async function generateBuyerReportImage(data: BuyerSummaryData): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = buildBuyerReportHTML(data);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        0.92
      );
    });
  } finally {
    document.body.removeChild(container);
  }
}

export async function shareReportImage(blob: Blob, title: string) {
  const file = new File([blob], `${title}.jpg`, { type: 'image/jpeg' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch {
      // Fall through to download
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
