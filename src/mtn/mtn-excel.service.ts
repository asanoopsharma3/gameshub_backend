import { BadRequestException, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const MSISDN_HEADER_NAMES = [
  'msisdn',
  'phone',
  'mobile',
  'number',
  'phonenumber',
  'msisdn_number',
  'subscriber',
];

@Injectable()
export class MtnExcelService {
  readMsisdnsFromFile(filePath: string): string[] {
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      throw new BadRequestException(
        'Only .xlsx, .xls, and .csv files are supported',
      );
    }

    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('Excel file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    });

    if (!rows.length) {
      throw new BadRequestException('Excel sheet is empty');
    }

    const { startRow, colIndex } = this.resolveColumnLayout(rows);
    const seen = new Set<string>();
    const msisdns: string[] = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const raw = row[colIndex];
      const normalized = this.normalizeMsisdn(raw);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      msisdns.push(normalized);
    }

    if (!msisdns.length) {
      throw new BadRequestException('No valid MSISDN values found in file');
    }

    return msisdns;
  }

  private resolveColumnLayout(rows: (string | number)[][]): {
    startRow: number;
    colIndex: number;
  } {
    const headerRow = rows[0].map((c) => String(c ?? '').trim());

    const namedCol = headerRow.findIndex((h) =>
      MSISDN_HEADER_NAMES.includes(h.toLowerCase()),
    );
    if (namedCol >= 0) {
      return { startRow: 1, colIndex: namedCol };
    }

    if (this.isHeaderRow(headerRow)) {
      return { startRow: 1, colIndex: 0 };
    }

    return { startRow: 0, colIndex: 0 };
  }

  private isHeaderRow(cells: string[]): boolean {
    const nonEmpty = cells.filter((c) => c.length > 0);
    if (!nonEmpty.length) return false;

    return nonEmpty.every((cell) => this.normalizeMsisdn(cell) === null);
  }

  private normalizeMsisdn(value: unknown): string | null {
    if (value === undefined || value === null) return null;

    let s = String(value).trim();
    if (!s) return null;

    if (/^[\d.]+e\+?\d+$/i.test(s)) {
      const n = Number(s);
      if (!Number.isNaN(n) && Number.isFinite(n)) {
        s = String(Math.trunc(n));
      }
    }

    s = s.replace(/[^\d+]/g, '');
    if (s.startsWith('+')) s = s.slice(1);
    s = s.replace(/\D/g, '');

    if (s.length < 8 || s.length > 20) return null;
    return s;
  }
}
