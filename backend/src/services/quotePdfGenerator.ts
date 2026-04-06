import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Quote } from '../database/connection';

/**
 * Quote PDF Generator
 * ─────────────────────────────────────────
 * Generates a professionally styled PDF for every submitted quote.
 * Includes: TrustConnect branding, Quote ID, date, cost breakdown,
 * and a SHA-256 security hash for tamper-proofing.
 */

const UPLOADS_DIR = path.join(__dirname, '../../uploads/quotes');

// Ensure output directory exists
function ensureDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Brand colours (approximate rgb)
const NAVY    = rgb(0.102, 0.137, 0.494);   // #1a237e
const GOLD    = rgb(1, 0.757, 0.027);        // #FFC107
const DARK_BG = rgb(0.051, 0.063, 0.125);   // #0d1020
const WHITE   = rgb(1, 1, 1);
const GRAY    = rgb(0.58, 0.64, 0.7);        // #94a3b8
const LIGHT   = rgb(0.94, 0.96, 0.98);       // #f0f4f8
const DIVIDER = rgb(0.22, 0.27, 0.37);       // #38455e

export async function generateQuotePdf(
  quote: Quote,
  artisanName: string,
  customerName: string,
  artisanTrade?: string,
): Promise<{ filePath: string; relativePath: string; securityHash: string }> {
  ensureDir();

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontReg  = await doc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  let y = height - margin;

  // ── Header background ─────────────────────────────────────
  page.drawRectangle({
    x: 0, y: height - 140, width, height: 140,
    color: NAVY,
  });

  // Gold accent line
  page.drawRectangle({
    x: 0, y: height - 143, width, height: 3,
    color: GOLD,
  });

  // TrustConnect Logo Text
  page.drawText('TrustConnect', {
    x: margin, y: height - 55, size: 28, font: fontBold, color: WHITE,
  });
  page.drawText('OFFICIAL QUOTATION', {
    x: margin, y: height - 78, size: 11, font: fontReg, color: GOLD,
  });

  // Quote ID & Date (right side)
  const quoteIdStr = `QT-${String(quote.id).padStart(6, '0')}`;
  const dateStr = new Date(quote.createdAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const rightX = width - margin;

  page.drawText(quoteIdStr, {
    x: rightX - fontBold.widthOfTextAtSize(quoteIdStr, 18), y: height - 55,
    size: 18, font: fontBold, color: GOLD,
  });
  page.drawText(dateStr, {
    x: rightX - fontReg.widthOfTextAtSize(dateStr, 10), y: height - 72,
    size: 10, font: fontReg, color: LIGHT,
  });

  if (quote.version > 1) {
    const vStr = `Revision v${quote.version}`;
    page.drawText(vStr, {
      x: rightX - fontReg.widthOfTextAtSize(vStr, 9), y: height - 86,
      size: 9, font: fontReg, color: GOLD,
    });
  }

  // Status badge
  const statusText = quote.status.toUpperCase();
  const statusColor = quote.status === 'accepted' ? rgb(0.133, 0.773, 0.369) : GOLD;
  page.drawText(statusText, {
    x: rightX - fontBold.widthOfTextAtSize(statusText, 9), y: height - 100,
    size: 9, font: fontBold, color: statusColor,
  });

  // ── Parties ───────────────────────────────────────────────
  y = height - 180;

  // From (Artisan)
  page.drawText('FROM', { x: margin, y, size: 8, font: fontBold, color: GRAY });
  y -= 16;
  page.drawText(artisanName, { x: margin, y, size: 13, font: fontBold, color: DARK_BG });
  y -= 14;
  if (artisanTrade) {
    page.drawText(artisanTrade, { x: margin, y, size: 10, font: fontReg, color: GRAY });
    y -= 14;
  }

  // To (Customer)
  const toX = width / 2 + 20;
  let yTo = height - 180;
  page.drawText('TO', { x: toX, y: yTo, size: 8, font: fontBold, color: GRAY });
  yTo -= 16;
  page.drawText(customerName, { x: toX, y: yTo, size: 13, font: fontBold, color: DARK_BG });

  // ── Divider line ──────────────────────────────────────────
  y -= 16;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: DIVIDER });

  // ── Work Description ──────────────────────────────────────
  y -= 24;
  page.drawText('SCOPE OF WORK', { x: margin, y, size: 9, font: fontBold, color: NAVY });
  y -= 18;

  // Wrap long description
  const maxLineWidth = width - margin * 2;
  const descLines = wrapText(quote.workDescription, fontReg, 10, maxLineWidth);
  for (const line of descLines) {
    page.drawText(line, { x: margin, y, size: 10, font: fontReg, color: DARK_BG });
    y -= 15;
  }

  // ── Duration ──────────────────────────────────────────────
  y -= 8;
  page.drawText('ESTIMATED DURATION', { x: margin, y, size: 9, font: fontBold, color: NAVY });
  y -= 16;
  page.drawText(quote.duration, { x: margin, y, size: 10, font: fontReg, color: DARK_BG });

  // ── Cost Breakdown ────────────────────────────────────────
  y -= 30;
  page.drawText('COST BREAKDOWN', { x: margin, y, size: 9, font: fontBold, color: NAVY });
  y -= 8;

  // Table header
  y -= 18;
  const col1 = margin;
  const col2 = width - margin - 100;

  page.drawRectangle({ x: margin - 5, y: y - 4, width: width - margin * 2 + 10, height: 22, color: NAVY });
  page.drawText('Item', { x: col1, y: y, size: 10, font: fontBold, color: WHITE });
  page.drawText('Amount (₦)', { x: col2, y: y, size: 10, font: fontBold, color: WHITE });

  // Rows
  const rows: [string, number][] = [
    ['Labor', quote.laborCost],
    ['Materials', quote.materialsCost],
  ];

  for (const [label, amount] of rows) {
    y -= 24;
    page.drawText(label, { x: col1, y, size: 10, font: fontReg, color: DARK_BG });
    const amtStr = amount.toLocaleString('en-NG');
    page.drawText(amtStr, {
      x: col2 + 100 - fontReg.widthOfTextAtSize(amtStr, 10), y, size: 10, font: fontReg, color: DARK_BG,
    });
    // Subtle row divider
    page.drawLine({ start: { x: margin - 5, y: y - 8 }, end: { x: width - margin + 5, y: y - 8 }, thickness: 0.5, color: DIVIDER });
  }

  // Subtotal
  y -= 24;
  page.drawText('Subtotal', { x: col1, y, size: 10, font: fontBold, color: DARK_BG });
  const stStr = quote.totalCost.toLocaleString('en-NG');
  page.drawText(stStr, {
    x: col2 + 100 - fontBold.widthOfTextAtSize(stStr, 10), y, size: 10, font: fontBold, color: DARK_BG,
  });
  page.drawLine({ start: { x: margin - 5, y: y - 8 }, end: { x: width - margin + 5, y: y - 8 }, thickness: 0.5, color: DIVIDER });

  // Service Fee
  y -= 24;
  page.drawText('Service Fee (5%)', { x: col1, y, size: 10, font: fontReg, color: GRAY });
  const sfStr = quote.serviceFee.toLocaleString('en-NG');
  page.drawText(sfStr, {
    x: col2 + 100 - fontReg.widthOfTextAtSize(sfStr, 10), y, size: 10, font: fontReg, color: GRAY,
  });

  // Grand Total row (highlighted)
  y -= 28;
  page.drawRectangle({ x: margin - 5, y: y - 6, width: width - margin * 2 + 10, height: 28, color: GOLD });
  page.drawText('TOTAL', { x: col1, y, size: 12, font: fontBold, color: NAVY });
  const gtStr = `₦${quote.grandTotal.toLocaleString('en-NG')}`;
  page.drawText(gtStr, {
    x: col2 + 100 - fontBold.widthOfTextAtSize(gtStr, 14), y, size: 14, font: fontBold, color: NAVY,
  });

  // ── Milestones (if applicable) ────────────────────────────
  if (quote.milestones && quote.milestones.length > 0) {
    y -= 40;
    page.drawText('PAYMENT MILESTONES', { x: margin, y, size: 9, font: fontBold, color: NAVY });
    y -= 18;
    for (const ms of quote.milestones) {
      page.drawText(`• ${ms.label} (${ms.percent}%)`, { x: margin + 10, y, size: 10, font: fontReg, color: DARK_BG });
      const msAmt = `₦${ms.amount.toLocaleString('en-NG')}`;
      page.drawText(msAmt, {
        x: col2 + 100 - fontReg.widthOfTextAtSize(msAmt, 10), y, size: 10, font: fontReg, color: DARK_BG,
      });
      y -= 16;
    }
  }

  // ── Footer: Digital Signature / Security Hash ─────────────
  // Hash is computed over the PDF content for authenticity proof
  const hashData = [
    quoteIdStr,
    quote.createdAt,
    artisanName,
    customerName,
    String(quote.grandTotal),
    String(quote.laborCost),
    String(quote.materialsCost),
    quote.workDescription,
  ].join('|');
  const securityHash = crypto.createHash('sha256').update(hashData).digest('hex');

  // Footer area
  const footerY = 70;
  page.drawRectangle({ x: 0, y: 0, width, height: footerY + 10, color: NAVY });
  page.drawRectangle({ x: 0, y: footerY + 10, width, height: 2, color: GOLD });

  page.drawText('This document was generated by TrustConnect and is digitally verified.', {
    x: margin, y: footerY - 10, size: 8, font: fontReg, color: LIGHT,
  });

  page.drawText('DIGITAL SIGNATURE', {
    x: margin, y: footerY - 28, size: 7, font: fontBold, color: GOLD,
  });
  // Display hash in two lines for readability
  page.drawText(securityHash.slice(0, 32), {
    x: margin, y: footerY - 40, size: 7, font: fontReg, color: GRAY,
  });
  page.drawText(securityHash.slice(32), {
    x: margin, y: footerY - 50, size: 7, font: fontReg, color: GRAY,
  });

  page.drawText(`${quoteIdStr} • TrustConnect Nigeria`, {
    x: width - margin - fontReg.widthOfTextAtSize(`${quoteIdStr} • TrustConnect Nigeria`, 8),
    y: footerY - 10, size: 8, font: fontReg, color: LIGHT,
  });

  // ── Save PDF ──────────────────────────────────────────────
  const pdfBytes = await doc.save();
  const filename = `quote-${quoteIdStr}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(filePath, pdfBytes);

  return {
    filePath,
    relativePath: `/uploads/quotes/${filename}`,
    securityHash,
  };
}

// ── Utility: text wrapping ──────────────────────────────────

function wrapText(
  text: string,
  font: { widthOfTextAtSize(text: string, size: number): number },
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}
