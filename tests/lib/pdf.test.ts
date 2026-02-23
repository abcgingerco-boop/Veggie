import { describe, it, expect } from 'vitest';
import { generateDailyReportPDF, generateBuyerSummaryPDF } from '@/lib/pdf';
import type { DailyReportData, BuyerSummaryData } from '@/lib/types';

describe('generateDailyReportPDF', () => {
  it('returns a valid jsPDF instance', () => {
    const data: DailyReportData = {
      date: '2024-01-15',
      vehicles: [
        { id: '1', date: '2024-01-15', vehicleNumber: 'MH-01-1234', gradeWiseBags: { A: 10, B: 5 } },
      ],
      buyerSummaries: [
        {
          buyer: { id: 'b1', name: 'Rajesh', isActive: true },
          grades: [
            {
              grade: 'A',
              bags: [
                { id: 'w1', date: '2024-01-15', buyerId: 'b1', grade: 'A', bagNumber: 1, weight: 60, timestamp: 0 },
              ],
              totalBags: 1,
              grossWeight: 60,
              netWeight: 59,
            },
          ],
        },
      ],
      inventory: [
        { grade: 'A', totalBagsStart: 10, soldBags: 1, pendingBags: 9, color: '#10b981' },
      ],
    };

    const doc = generateDailyReportPDF(data);
    expect(doc).toBeDefined();

    const output = doc.output('arraybuffer');
    const header = new Uint8Array(output.slice(0, 5));
    const pdfHeader = String.fromCharCode(...header);
    expect(pdfHeader).toBe('%PDF-');
  });

  it('handles empty data gracefully', () => {
    const data: DailyReportData = {
      date: '2024-01-15',
      vehicles: [],
      buyerSummaries: [],
      inventory: [],
    };

    const doc = generateDailyReportPDF(data);
    expect(doc).toBeDefined();

    const output = doc.output('arraybuffer');
    const header = new Uint8Array(output.slice(0, 5));
    const pdfHeader = String.fromCharCode(...header);
    expect(pdfHeader).toBe('%PDF-');
  });
});

describe('generateBuyerSummaryPDF', () => {
  it('returns a valid jsPDF instance with buyer data', () => {
    const data: BuyerSummaryData = {
      buyer: { id: 'b1', name: 'Rajesh Kumar', phone: '9876543210', isActive: true },
      date: '2024-01-15',
      grades: [
        {
          grade: 'A',
          color: '#10b981',
          bags: [
            { id: 'w1', date: '2024-01-15', buyerId: 'b1', grade: 'A', bagNumber: 1, weight: 60, timestamp: 0 },
            { id: 'w2', date: '2024-01-15', buyerId: 'b1', grade: 'A', bagNumber: 2, weight: 55, timestamp: 0 },
          ],
          totalBags: 2,
          grossWeight: 115,
          netWeight: 113,
        },
      ],
    };

    const doc = generateBuyerSummaryPDF(data);
    expect(doc).toBeDefined();

    const output = doc.output('arraybuffer');
    const header = new Uint8Array(output.slice(0, 5));
    const pdfHeader = String.fromCharCode(...header);
    expect(pdfHeader).toBe('%PDF-');
  });

  it('handles empty grades gracefully', () => {
    const data: BuyerSummaryData = {
      buyer: { id: 'b1', name: 'Test Buyer', isActive: true },
      date: '2024-01-15',
      grades: [],
    };

    const doc = generateBuyerSummaryPDF(data);
    expect(doc).toBeDefined();

    const output = doc.output('arraybuffer');
    const header = new Uint8Array(output.slice(0, 5));
    const pdfHeader = String.fromCharCode(...header);
    expect(pdfHeader).toBe('%PDF-');
  });
});
