import { CSVColumnMapping, CreateMeasurementRequest, CSVPreviewData } from '@/types';

export interface MappingResult {
  success: boolean;
  measurements: CreateMeasurementRequest[];
  errors: MappingError[];
}

export interface MappingError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface MappingOptions {
  projectId: string;
  defaultType: 'water_quality' | 'atmospheric' | 'soil';
  defaultOperatorId?: string;
  defaultDeviceId?: string;
  skipInvalidRows: boolean;
}

export class CSVMapper {
  private columnMapping: CSVColumnMapping;
  private options: MappingOptions;

  constructor(columnMapping: CSVColumnMapping, options: MappingOptions) {
    this.columnMapping = columnMapping;
    this.options = options;
  }

  mapDataToMeasurements(csvData: CSVPreviewData): MappingResult {
    const measurements: CreateMeasurementRequest[] = [];
    const errors: MappingError[] = [];

    csvData.rows.forEach((row, index) => {
      const rowNumber = index + 2; // ヘッダー行を考慮

      try {
        const measurement = this.mapRowToMeasurement(row, rowNumber);
        if (measurement) {
          measurements.push(measurement);
        }
      } catch (error) {
        if (!this.options.skipInvalidRows) {
          errors.push({
            row: rowNumber,
            field: 'general',
            value: JSON.stringify(row),
            message: error instanceof Error ? error.message : '行の変換に失敗しました'
          });
        }
      }
    });

    return {
      success: errors.length === 0,
      measurements,
      errors
    };
  }

  private mapRowToMeasurement(row: Record<string, string>, rowNumber: number): CreateMeasurementRequest | null {
    const measurement: CreateMeasurementRequest = {
      projectId: this.options.projectId,
      timestamp: this.mapTimestamp(row, rowNumber),
      type: this.mapType(row) || this.options.defaultType,
      location: this.mapLocation(row, rowNumber),
      values: this.mapValues(row, rowNumber),
      notes: this.mapNotes(row),
      operatorId: this.options.defaultOperatorId,
      deviceId: this.options.defaultDeviceId
    };

    // 必須フィールドのチェック
    if (!measurement.timestamp) {
      throw new Error('タイムスタンプが必須です');
    }

    return measurement;
  }

  private mapTimestamp(row: Record<string, string>, rowNumber: number): string {
    if (!this.columnMapping.timestamp) {
      throw new Error('タイムスタンプのカラムマッピングが設定されていません');
    }

    const timestampValue = row[this.columnMapping.timestamp]?.trim();
    if (!timestampValue) {
      throw new Error('タイムスタンプが空です');
    }

    // 様々な日付形式をサポート
    const timestamp = this.parseTimestamp(timestampValue);
    if (!timestamp) {
      throw new Error(`タイムスタンプの形式が不正です: ${timestampValue}`);
    }

    return timestamp;
  }

  private parseTimestamp(value: string): string | null {
    // ISO形式のチェック
    if (value.includes('T') && value.includes('Z')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // 日本の一般的な形式
    const patterns = [
      // YYYY-MM-DD HH:mm:ss
      /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
      // YYYY/MM/DD HH:mm:ss
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
      // YYYY-MM-DD HH:mm
      /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,
      // YYYY/MM/DD HH:mm
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // YYYY/MM/DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
    ];

    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) {
        const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
        const date = new Date(
          parseInt(year),
          parseInt(month) - 1, // monthは0ベース
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );

        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }

    // 最後の手段としてDate.parseを試す
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }

    return null;
  }

  private mapType(row: Record<string, string>): 'water_quality' | 'atmospheric' | 'soil' | undefined {
    if (!this.columnMapping.type) {
      return undefined;
    }

    const typeValue = row[this.columnMapping.type]?.trim().toLowerCase();
    if (!typeValue) {
      return undefined;
    }

    // 日本語と英語の両方をサポート
    if (typeValue.includes('水質') || typeValue.includes('water')) {
      return 'water_quality';
    }
    if (typeValue.includes('大気') || typeValue.includes('atmospheric') || typeValue.includes('air')) {
      return 'atmospheric';
    }
    if (typeValue.includes('土壌') || typeValue.includes('soil')) {
      return 'soil';
    }

    return undefined;
  }

  private mapLocation(row: Record<string, string>, rowNumber: number): { latitude: number; longitude: number; siteName?: string } {
    const location = {
      latitude: 0,
      longitude: 0,
      siteName: undefined as string | undefined
    };

    // 緯度
    if (this.columnMapping.latitude) {
      const latValue = row[this.columnMapping.latitude]?.trim();
      if (latValue) {
        const lat = parseFloat(latValue);
        if (isNaN(lat)) {
          throw new Error(`緯度の値が不正です: ${latValue}`);
        }
        if (lat < -90 || lat > 90) {
          throw new Error(`緯度は-90から90の範囲で指定してください: ${lat}`);
        }
        location.latitude = lat;
      }
    }

    // 経度
    if (this.columnMapping.longitude) {
      const lngValue = row[this.columnMapping.longitude]?.trim();
      if (lngValue) {
        const lng = parseFloat(lngValue);
        if (isNaN(lng)) {
          throw new Error(`経度の値が不正です: ${lngValue}`);
        }
        if (lng < -180 || lng > 180) {
          throw new Error(`経度は-180から180の範囲で指定してください: ${lng}`);
        }
        location.longitude = lng;
      }
    }

    // 測定地点名
    if (this.columnMapping.siteName) {
      const siteName = row[this.columnMapping.siteName]?.trim();
      if (siteName) {
        location.siteName = siteName;
      }
    }

    return location;
  }

  private mapValues(row: Record<string, string>, rowNumber: number): Partial<CreateMeasurementRequest['values']> {
    const values: Partial<CreateMeasurementRequest['values']> = {};

    // 数値項目のマッピング
    const numericFields = [
      'ph', 'temperature', 'turbidity', 'conductivity', 'dissolvedOxygen',
      'co2Concentration', 'humidity', 'airPressure', 'windSpeed',
      'soilPH', 'soilMoisture', 'organicMatter',
      'iron', 'copper', 'zinc', 'lead', 'cadmium',
      'flowRate', 'processedVolume', 'co2Captured', 'mineralPrecipitation'
    ] as const;

    numericFields.forEach(field => {
      const columnName = this.columnMapping[field];
      if (columnName) {
        const value = row[columnName]?.trim();
        if (value) {
          const numValue = this.parseNumericValue(value, field);
          if (numValue !== null) {
            (values as any)[field] = numValue;
          }
        }
      }
    });

    return values;
  }

  private parseNumericValue(value: string, field: string): number | null {
    // カンマ区切りの数値をサポート
    const normalizedValue = value.replace(/,/g, '');
    
    // 単位記号の除去
    const cleanValue = normalizedValue.replace(/[°℃%ppmL\/minmg\/LhPam\/sNTUμS\/cmkg]/g, '');
    
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) {
      return null;
    }

    // 合理性チェック
    if (!this.isReasonableValue(field, numValue)) {
      throw new Error(`${field}の値が範囲外です: ${numValue}`);
    }

    return numValue;
  }

  private isReasonableValue(field: string, value: number): boolean {
    const ranges: Record<string, { min: number; max: number }> = {
      ph: { min: 0, max: 14 },
      temperature: { min: -50, max: 100 },
      turbidity: { min: 0, max: 1000 },
      conductivity: { min: 0, max: 50000 },
      dissolvedOxygen: { min: 0, max: 20 },
      co2Concentration: { min: 0, max: 10000 },
      humidity: { min: 0, max: 100 },
      airPressure: { min: 800, max: 1200 },
      windSpeed: { min: 0, max: 100 },
      soilPH: { min: 0, max: 14 },
      soilMoisture: { min: 0, max: 100 },
      organicMatter: { min: 0, max: 100 },
      iron: { min: 0, max: 1000 },
      copper: { min: 0, max: 1000 },
      zinc: { min: 0, max: 1000 },
      lead: { min: 0, max: 100 },
      cadmium: { min: 0, max: 10 },
      flowRate: { min: 0, max: 100000 },
      processedVolume: { min: 0, max: 1000000 },
      co2Captured: { min: 0, max: 100000 },
      mineralPrecipitation: { min: 0, max: 100000 }
    };

    const range = ranges[field];
    if (!range) {
      return true; // 範囲が定義されていない場合は通す
    }

    return value >= range.min && value <= range.max;
  }

  private mapNotes(row: Record<string, string>): string | undefined {
    if (!this.columnMapping.notes) {
      return undefined;
    }

    const notes = row[this.columnMapping.notes]?.trim();
    return notes || undefined;
  }

  // バッチ処理用のチャンク分割
  static chunkMeasurements(measurements: CreateMeasurementRequest[], chunkSize: number): CreateMeasurementRequest[][] {
    const chunks: CreateMeasurementRequest[][] = [];
    
    for (let i = 0; i < measurements.length; i += chunkSize) {
      chunks.push(measurements.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  // プレビュー用の変換（最初の数行のみ）
  mapPreviewData(csvData: CSVPreviewData, maxRows: number = 5): {
    previewMeasurements: CreateMeasurementRequest[];
    mappingErrors: MappingError[];
  } {
    const previewRows = csvData.rows.slice(0, maxRows);
    const previewData: CSVPreviewData = {
      ...csvData,
      rows: previewRows,
      previewRows: previewRows.length
    };

    const result = this.mapDataToMeasurements(previewData);
    
    return {
      previewMeasurements: result.measurements,
      mappingErrors: result.errors
    };
  }

  // マッピング統計情報
  getMappingStats(result: MappingResult): {
    totalRows: number;
    successfulMappings: number;
    failedMappings: number;
    mappedFields: string[];
    unmappedFields: string[];
  } {
    const mappedFields = Object.values(this.columnMapping).filter(Boolean) as string[];
    const allPossibleFields = Object.keys(this.columnMapping);
    const unmappedFields = allPossibleFields.filter(field => !this.columnMapping[field as keyof CSVColumnMapping]);

    return {
      totalRows: result.measurements.length + result.errors.length,
      successfulMappings: result.measurements.length,
      failedMappings: result.errors.length,
      mappedFields,
      unmappedFields
    };
  }
}