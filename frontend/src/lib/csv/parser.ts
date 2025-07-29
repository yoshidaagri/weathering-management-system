import { CSVPreviewData, CSVValidationSettings } from '@/types';

export interface CSVParseResult {
  success: boolean;
  data?: CSVPreviewData;
  error?: string;
}

export interface CSVParseOptions {
  delimiter?: string;
  encoding?: string;
  maxPreviewRows?: number;
  skipEmptyLines?: boolean;
}

export class CSVParser {
  private options: Required<CSVParseOptions>;

  constructor(options: CSVParseOptions = {}) {
    this.options = {
      delimiter: options.delimiter || ',',
      encoding: options.encoding || 'UTF-8',
      maxPreviewRows: options.maxPreviewRows || 10,
      skipEmptyLines: options.skipEmptyLines ?? true
    };
  }

  async parseFile(file: File): Promise<CSVParseResult> {
    try {
      const text = await this.readFileAsText(file);
      return this.parseText(text);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ファイルの読み込みに失敗しました'
      };
    }
  }

  parseText(text: string): CSVParseResult {
    try {
      const lines = this.splitLines(text);
      
      if (lines.length === 0) {
        return {
          success: false,
          error: 'CSVファイルが空です'
        };
      }

      const headers = this.parseLine(lines[0]);
      
      if (headers.length === 0) {
        return {
          success: false,
          error: 'ヘッダー行が見つかりません'
        };
      }

      // 重複ヘッダーチェック
      const duplicateHeaders = this.findDuplicateHeaders(headers);
      if (duplicateHeaders.length > 0) {
        return {
          success: false,
          error: `重複するヘッダーが見つかりました: ${duplicateHeaders.join(', ')}`
        };
      }

      const dataLines = lines.slice(1);
      const totalRows = dataLines.length;
      const previewLines = dataLines.slice(0, this.options.maxPreviewRows);
      
      const rows: Array<Record<string, string>> = [];
      const parseErrors: string[] = [];

      for (let i = 0; i < previewLines.length; i++) {
        try {
          const values = this.parseLine(previewLines[i]);
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          rows.push(row);
        } catch (error) {
          parseErrors.push(`行 ${i + 2}: ${error instanceof Error ? error.message : '解析エラー'}`);
        }
      }

      // エラーが多すぎる場合は失敗とする
      if (parseErrors.length > previewLines.length * 0.5) {
        return {
          success: false,
          error: `解析エラーが多すぎます: ${parseErrors.slice(0, 3).join(', ')}${parseErrors.length > 3 ? '...' : ''}`
        };
      }

      const data: CSVPreviewData = {
        headers,
        rows,
        totalRows,
        previewRows: rows.length
      };

      return {
        success: true,
        data
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSVの解析に失敗しました'
      };
    }
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('ファイルの読み込み結果が不正です'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      
      reader.readAsText(file, this.options.encoding);
    });
  }

  private splitLines(text: string): string[] {
    const lines = text.split(/\r?\n/);
    
    if (this.options.skipEmptyLines) {
      return lines.filter(line => line.trim().length > 0);
    }
    
    return lines;
  }

  private parseLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === this.options.delimiter && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }

    // Add the last field
    values.push(current.trim());

    return values.map(value => {
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
      }
      return value;
    });
  }

  private findDuplicateHeaders(headers: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      if (seen.has(normalizedHeader)) {
        duplicates.add(header);
      } else {
        seen.add(normalizedHeader);
      }
    }

    return Array.from(duplicates);
  }

  // CSVテンプレート生成
  static generateTemplate(): string {
    const headers = [
      'timestamp',
      'type',
      'ph',
      'temperature',
      'co2_concentration',
      'flow_rate',
      'iron',
      'copper',
      'zinc',
      'turbidity',
      'conductivity',
      'dissolved_oxygen',
      'latitude',
      'longitude',
      'site_name',
      'notes'
    ];

    const sampleData = [
      [
        '2025-07-28 09:00:00',
        'water_quality',
        '7.2',
        '25.5',
        '400',
        '100.5',
        '0.1',
        '0.05',
        '0.2',
        '2.1',
        '250',
        '8.5',
        '43.0642',
        '141.9716',
        '測定ポイントA',
        '正常運転'
      ],
      [
        '2025-07-28 09:15:00',
        'water_quality',
        '7.1',
        '25.8',
        '405',
        '98.2',
        '0.12',
        '0.04',
        '0.22',
        '2.3',
        '255',
        '8.3',
        '43.0642',
        '141.9716',
        '測定ポイントA',
        ''
      ],
      [
        '2025-07-28 09:30:00',
        'water_quality',
        '6.9',
        '26.1',
        '410',
        '95.8',
        '0.15',
        '0.06',
        '0.25',
        '2.8',
        '265',
        '8.2',
        '43.0642',
        '141.9716',
        '測定ポイントA',
        'pH値がやや低下傾向'
      ]
    ];

    const csvLines = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ];

    return csvLines.join('\n');
  }

  // CSV自動カラム検出
  static detectColumns(headers: string[]): Partial<Record<string, string>> {
    const mapping: Partial<Record<string, string>> = {};
    
    const columnPatterns = {
      timestamp: [/timestamp/i, /日時/i, /time/i, /date/i],
      ph: [/^ph$/i, /ペーハー/i, /水素イオン/i],
      temperature: [/temp/i, /温度/i, /気温/i, /水温/i],
      co2Concentration: [/co2/i, /二酸化炭素/i, /炭酸ガス/i],
      flowRate: [/flow/i, /流量/i, /流速/i],
      iron: [/iron/i, /fe/i, /鉄/i],
      copper: [/copper/i, /cu/i, /銅/i],
      zinc: [/zinc/i, /zn/i, /亜鉛/i],
      turbidity: [/turbidity/i, /濁度/i, /濁り/i],
      conductivity: [/conductivity/i, /電気伝導度/i, /導電率/i],
      dissolvedOxygen: [/oxygen/i, /溶存酸素/i, /do/i],
      latitude: [/lat/i, /緯度/i],
      longitude: [/lon/i, /lng/i, /経度/i],
      siteName: [/site/i, /場所/i, /地点/i, /location/i],
      notes: [/note/i, /memo/i, /メモ/i, /備考/i, /comment/i]
    };

    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [key, patterns] of Object.entries(columnPatterns)) {
        if (patterns.some(pattern => pattern.test(normalizedHeader))) {
          mapping[key] = header;
          break;
        }
      }
    });

    return mapping;
  }
}