import { CSVValidationSettings, CSVColumnMapping, CreateMeasurementRequest } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  row: number;
  column: string;
  value: string;
  message: string;
}

export interface DataValidationRules {
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email';
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

export class CSVValidator {
  private settings: CSVValidationSettings;
  private columnMapping: CSVColumnMapping;

  constructor(settings: CSVValidationSettings, columnMapping: CSVColumnMapping) {
    this.settings = settings;
    this.columnMapping = columnMapping;
  }

  validateData(rows: Array<Record<string, string>>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // バリデーションルールの定義
    const validationRules: Record<string, DataValidationRules> = {
      timestamp: {
        required: true,
        type: 'date'
      },
      ph: {
        required: false,
        type: 'number',
        min: 0,
        max: 14
      },
      temperature: {
        required: false,
        type: 'number',
        min: -50,
        max: 100
      },
      co2Concentration: {
        required: false,
        type: 'number',
        min: 0,
        max: 10000
      },
      flowRate: {
        required: false,
        type: 'number',
        min: 0,
        max: 100000
      },
      iron: {
        required: false,
        type: 'number',
        min: 0,
        max: 1000
      },
      copper: {
        required: false,
        type: 'number',
        min: 0,
        max: 1000
      },
      zinc: {
        required: false,
        type: 'number',
        min: 0,
        max: 1000
      },
      turbidity: {
        required: false,
        type: 'number',
        min: 0,
        max: 1000
      },
      conductivity: {
        required: false,
        type: 'number',
        min: 0,
        max: 50000
      },
      dissolvedOxygen: {
        required: false,
        type: 'number',
        min: 0,
        max: 20
      },
      latitude: {
        required: false,
        type: 'number',
        min: -90,
        max: 90
      },
      longitude: {
        required: false,
        type: 'number',
        min: -180,
        max: 180
      },
      siteName: {
        required: false,
        type: 'string'
      },
      notes: {
        required: false,
        type: 'string'
      }
    };

    // 各行をバリデーション
    rows.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 2; // ヘッダー行を考慮

      // 必須フィールドのチェック
      Object.entries(this.columnMapping).forEach(([field, columnName]) => {
        if (!columnName) return;

        const rule = validationRules[field];
        if (!rule) return;

        const value = row[columnName]?.trim() || '';

        // 必須チェック
        if (rule.required && !value) {
          errors.push({
            row: rowNumber,
            column: columnName,
            value,
            message: `${this.getFieldDisplayName(field)}は必須項目です`,
            severity: 'error'
          });
          return;
        }

        // 値が空の場合はスキップ
        if (!value) return;

        // 型チェック
        const typeValidation = this.validateType(value, rule.type);
        if (!typeValidation.isValid) {
          errors.push({
            row: rowNumber,
            column: columnName,
            value,
            message: `${this.getFieldDisplayName(field)}の形式が正しくありません: ${typeValidation.message}`,
            severity: 'error'
          });
          continue;
        }

        // 範囲チェック
        if (rule.type === 'number') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            if (rule.min !== undefined && numValue < rule.min) {
              errors.push({
                row: rowNumber,
                column: columnName,
                value,
                message: `${this.getFieldDisplayName(field)}は${rule.min}以上である必要があります`,
                severity: 'error'
              });
            }
            if (rule.max !== undefined && numValue > rule.max) {
              errors.push({
                row: rowNumber,
                column: columnName,
                value,
                message: `${this.getFieldDisplayName(field)}は${rule.max}以下である必要があります`,
                severity: 'error'
              });
            }

            // 警告レベルのチェック
            this.checkWarningConditions(field, numValue, rowNumber, columnName, warnings);
          }
        }

        // カスタムバリデーション
        if (rule.customValidator && !rule.customValidator(value)) {
          errors.push({
            row: rowNumber,
            column: columnName,
            value,
            message: `${this.getFieldDisplayName(field)}の値が不正です`,
            severity: 'error'
          });
        }
      });

      // 行レベルのバリデーション
      this.validateRowLogic(row, rowNumber, errors, warnings);
    });

    // 重複データのチェック
    this.checkDuplicates(rows, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateType(value: string, type: string): { isValid: boolean; message?: string } {
    switch (type) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return { isValid: false, message: '数値である必要があります' };
        }
        return { isValid: true };

      case 'date':
        const dateValue = new Date(value);
        if (isNaN(dateValue.getTime())) {
          return { isValid: false, message: '日付形式が正しくありません (例: 2025-07-28 09:00:00)' };
        }
        // 未来日付のチェック
        if (dateValue > new Date()) {
          return { isValid: false, message: '未来の日付は指定できません' };
        }
        return { isValid: true };

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          return { isValid: false, message: 'メールアドレスの形式が正しくありません' };
        }
        return { isValid: true };

      case 'string':
        return { isValid: true };

      default:
        return { isValid: true };
    }
  }

  private checkWarningConditions(
    field: string,
    value: number,
    row: number,
    column: string,
    warnings: ValidationWarning[]
  ): void {
    const warningConditions: Record<string, { condition: (val: number) => boolean; message: string }> = {
      ph: {
        condition: (val) => val < 6.5 || val > 8.5,
        message: 'pH値が正常範囲外です (推奨: 6.5-8.5)'
      },
      temperature: {
        condition: (val) => val < 5 || val > 35,
        message: '温度が標準範囲外です (推奨: 5-35°C)'
      },
      co2Concentration: {
        condition: (val) => val > 1000,
        message: 'CO2濃度が高すぎる可能性があります'
      },
      iron: {
        condition: (val) => val > 10,
        message: '鉄濃度が高すぎる可能性があります'
      },
      copper: {
        condition: (val) => val > 1,
        message: '銅濃度が高すぎる可能性があります'
      },
      zinc: {
        condition: (val) => val > 5,
        message: '亜鉛濃度が高すぎる可能性があります'
      }
    };

    const condition = warningConditions[field];
    if (condition && condition.condition(value)) {
      warnings.push({
        row,
        column,
        value: value.toString(),
        message: condition.message
      });
    }
  }

  private validateRowLogic(
    row: Record<string, string>,
    rowNumber: number,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // 緯度・経度の組み合わせチェック
    const latitude = this.columnMapping.latitude ? row[this.columnMapping.latitude] : '';
    const longitude = this.columnMapping.longitude ? row[this.columnMapping.longitude] : '';

    if ((latitude && !longitude) || (!latitude && longitude)) {
      errors.push({
        row: rowNumber,
        column: latitude ? this.columnMapping.latitude! : this.columnMapping.longitude!,
        value: latitude || longitude,
        message: '緯度と経度は両方指定するか、両方省略してください',
        severity: 'error'
      });
    }

    // 日本の座標範囲チェック
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        if (lat < 20 || lat > 46 || lng < 123 || lng > 146) {
          warnings.push({
            row: rowNumber,
            column: this.columnMapping.latitude!,
            value: `${lat}, ${lng}`,
            message: '座標が日本の範囲外の可能性があります'
          });
        }
      }
    }

    // 測定値の論理的整合性チェック
    const ph = this.columnMapping.ph ? parseFloat(row[this.columnMapping.ph]) : NaN;
    const temperature = this.columnMapping.temperature ? parseFloat(row[this.columnMapping.temperature]) : NaN;

    if (!isNaN(ph) && !isNaN(temperature)) {
      // 高温でpHが異常に高い/低い場合の警告
      if (temperature > 30 && (ph < 6 || ph > 9)) {
        warnings.push({
          row: rowNumber,
          column: this.columnMapping.ph!,
          value: ph.toString(),
          message: '高温環境でのpH値が異常値の可能性があります'
        });
      }
    }
  }

  private checkDuplicates(rows: Array<Record<string, string>>, errors: ValidationError[]): void {
    const seen = new Set<string>();
    
    rows.forEach((row, index) => {
      const timestamp = this.columnMapping.timestamp ? row[this.columnMapping.timestamp] : '';
      const latitude = this.columnMapping.latitude ? row[this.columnMapping.latitude] : '';
      const longitude = this.columnMapping.longitude ? row[this.columnMapping.longitude] : '';
      
      // 重複判定用のキーを生成
      const key = `${timestamp}_${latitude}_${longitude}`;
      
      if (timestamp && seen.has(key)) {
        errors.push({
          row: index + 2,
          column: this.columnMapping.timestamp!,
          value: timestamp,
          message: '同じ時刻・場所の測定データが重複しています',
          severity: 'error'
        });
      } else if (timestamp) {
        seen.add(key);
      }
    });
  }

  private getFieldDisplayName(field: string): string {
    const displayNames: Record<string, string> = {
      timestamp: 'タイムスタンプ',
      ph: 'pH値',
      temperature: '温度',
      co2Concentration: 'CO2濃度',
      flowRate: '流量',
      iron: '鉄濃度',
      copper: '銅濃度',
      zinc: '亜鉛濃度',
      turbidity: '濁度',
      conductivity: '電気伝導度',
      dissolvedOxygen: '溶存酸素',
      latitude: '緯度',
      longitude: '経度',
      siteName: '測定地点名',
      notes: 'メモ'
    };

    return displayNames[field] || field;
  }

  // データの修正提案
  static suggestCorrections(errors: ValidationError[]): Array<{ row: number; column: string; suggestedValue: string; reason: string }> {
    const suggestions: Array<{ row: number; column: string; suggestedValue: string; reason: string }> = [];

    errors.forEach(error => {
      const value = error.value;
      let suggestedValue = '';
      let reason = '';

      // 数値の修正提案
      if (error.message.includes('数値である必要があります')) {
        const numMatch = value.match(/[\d.]+/);
        if (numMatch) {
          suggestedValue = numMatch[0];
          reason = '数値部分のみを抽出';
        }
      }

      // 日付の修正提案
      if (error.message.includes('日付形式が正しくありません')) {
        const dateMatch = value.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          suggestedValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} 00:00:00`;
          reason = '標準的な日付時刻形式に変換';
        }
      }

      // pH値の修正提案
      if (error.column.toLowerCase().includes('ph') && !isNaN(parseFloat(value))) {
        const numValue = parseFloat(value);
        if (numValue > 14) {
          suggestedValue = (numValue / 10).toString();
          reason = '単位を調整 (pH値は0-14の範囲)';
        }
      }

      if (suggestedValue) {
        suggestions.push({
          row: error.row,
          column: error.column,
          suggestedValue,
          reason
        });
      }
    });

    return suggestions;
  }

  // バリデーション統計
  getValidationStats(result: ValidationResult): {
    totalErrors: number;
    totalWarnings: number;
    errorsByType: Record<string, number>;
    mostCommonErrors: Array<{ message: string; count: number }>;
  } {
    const errorsByType: Record<string, number> = {};
    const errorMessages: Record<string, number> = {};

    result.errors.forEach(error => {
      const errorType = error.column;
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      errorMessages[error.message] = (errorMessages[error.message] || 0) + 1;
    });

    const mostCommonErrors = Object.entries(errorMessages)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));

    return {
      totalErrors: result.errors.length,
      totalWarnings: result.warnings.length,
      errorsByType,
      mostCommonErrors
    };
  }
}