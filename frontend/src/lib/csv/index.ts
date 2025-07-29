// CSV処理ユーティリティのエントリーポイント
export { CSVParser } from './parser';
export type { CSVParseResult, CSVParseOptions } from './parser';

export { CSVValidator } from './validator';
export type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  DataValidationRules 
} from './validator';

export { CSVMapper } from './mapper';
export type { 
  MappingResult, 
  MappingError, 
  MappingOptions 
} from './mapper';

// CSV処理の統合クラス
import { CSVParser, CSVParseResult } from './parser';
import { CSVValidator, ValidationResult } from './validator';
import { CSVMapper, MappingResult } from './mapper';
import { CSVColumnMapping, CSVValidationSettings, CreateMeasurementRequest } from '@/types';

export interface CSVProcessorOptions {
  projectId: string;
  columnMapping: CSVColumnMapping;
  validationSettings?: CSVValidationSettings;
  skipInvalidRows?: boolean;
  batchSize?: number;
}

export interface CSVProcessResult {
  success: boolean;
  parseResult?: CSVParseResult;
  validationResult?: ValidationResult;
  mappingResult?: MappingResult;
  finalMeasurements: CreateMeasurementRequest[];
  totalProcessed: number;
  totalErrors: number;
  processingTime: number;
  summary: {
    parsing: { success: boolean; error?: string };
    validation: { valid: boolean; errorCount: number; warningCount: number };
    mapping: { success: boolean; successCount: number; errorCount: number };
  };
}

export class CSVProcessor {
  private options: Required<CSVProcessorOptions>;

  constructor(options: CSVProcessorOptions) {
    this.options = {
      validationSettings: {
        skipInvalidRows: true,
        dateFormat: 'YYYY-MM-DD HH:mm:ss',
        numberFormat: 'decimal',
        requiredColumns: ['timestamp']
      },
      skipInvalidRows: true,
      batchSize: 100,
      ...options
    };
  }

  async processFile(file: File): Promise<CSVProcessResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: CSVファイルの解析
      const parser = new CSVParser();
      const parseResult = await parser.parseFile(file);

      if (!parseResult.success || !parseResult.data) {
        return this.createErrorResult(startTime, {
          parsing: { success: false, error: parseResult.error },
          validation: { valid: false, errorCount: 0, warningCount: 0 },
          mapping: { success: false, successCount: 0, errorCount: 0 }
        });
      }

      // Step 2: データバリデーション
      const validator = new CSVValidator(this.options.validationSettings, this.options.columnMapping);
      const validationResult = validator.validateData(parseResult.data.rows);

      // バリデーションエラーが多すぎる場合は処理を中止
      if (!this.options.skipInvalidRows && validationResult.errors.length > 0) {
        return this.createErrorResult(startTime, {
          parsing: { success: true },
          validation: { 
            valid: false, 
            errorCount: validationResult.errors.length, 
            warningCount: validationResult.warnings.length 
          },
          mapping: { success: false, successCount: 0, errorCount: 0 }
        }, parseResult, validationResult);
      }

      // Step 3: データマッピング
      const mapper = new CSVMapper(this.options.columnMapping, {
        projectId: this.options.projectId,
        defaultType: 'water_quality',
        skipInvalidRows: this.options.skipInvalidRows
      });

      const mappingResult = mapper.mapDataToMeasurements(parseResult.data);

      const processingTime = Date.now() - startTime;

      return {
        success: mappingResult.success && (this.options.skipInvalidRows || validationResult.isValid),
        parseResult,
        validationResult,
        mappingResult,
        finalMeasurements: mappingResult.measurements,
        totalProcessed: mappingResult.measurements.length,
        totalErrors: validationResult.errors.length + mappingResult.errors.length,
        processingTime,
        summary: {
          parsing: { success: true },
          validation: { 
            valid: validationResult.isValid, 
            errorCount: validationResult.errors.length, 
            warningCount: validationResult.warnings.length 
          },
          mapping: { 
            success: mappingResult.success, 
            successCount: mappingResult.measurements.length, 
            errorCount: mappingResult.errors.length 
          }
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        success: false,
        finalMeasurements: [],
        totalProcessed: 0,
        totalErrors: 1,
        processingTime,
        summary: {
          parsing: { 
            success: false, 
            error: error instanceof Error ? error.message : '不明なエラーが発生しました' 
          },
          validation: { valid: false, errorCount: 0, warningCount: 0 },
          mapping: { success: false, successCount: 0, errorCount: 0 }
        }
      };
    }
  }

  private createErrorResult(
    startTime: number,
    summary: CSVProcessResult['summary'],
    parseResult?: CSVParseResult,
    validationResult?: ValidationResult
  ): CSVProcessResult {
    return {
      success: false,
      parseResult,
      validationResult,
      finalMeasurements: [],
      totalProcessed: 0,
      totalErrors: (validationResult?.errors.length || 0) + 1,
      processingTime: Date.now() - startTime,
      summary
    };
  }

  // バッチ処理用のメソッド
  async processBatches(
    measurements: CreateMeasurementRequest[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<CreateMeasurementRequest[][]> {
    const batches = CSVMapper.chunkMeasurements(measurements, this.options.batchSize);
    
    if (onProgress) {
      onProgress(0, measurements.length);
    }

    return batches;
  }

  // 処理統計の生成
  generateProcessingReport(result: CSVProcessResult): string {
    const report = [
      '=== CSV処理レポート ===',
      `処理時間: ${result.processingTime}ms`,
      `総データ数: ${result.totalProcessed + result.totalErrors}`,
      `成功: ${result.totalProcessed}`,
      `エラー: ${result.totalErrors}`,
      '',
      '=== 段階別結果 ===',
      `解析: ${result.summary.parsing.success ? '成功' : '失敗' + (result.summary.parsing.error ? ` (${result.summary.parsing.error})` : '')}`,
      `バリデーション: ${result.summary.validation.valid ? '成功' : `失敗 (エラー: ${result.summary.validation.errorCount}, 警告: ${result.summary.validation.warningCount})`}`,
      `マッピング: ${result.summary.mapping.success ? '成功' : `失敗 (成功: ${result.summary.mapping.successCount}, エラー: ${result.summary.mapping.errorCount})`}`,
      ''
    ];

    // 詳細エラー情報
    if (result.validationResult?.errors.length) {
      report.push('=== バリデーションエラー (上位5件) ===');
      result.validationResult.errors.slice(0, 5).forEach(error => {
        report.push(`行 ${error.row}, ${error.column}: ${error.message}`);
      });
      report.push('');
    }

    if (result.mappingResult?.errors.length) {
      report.push('=== マッピングエラー (上位5件) ===');
      result.mappingResult.errors.slice(0, 5).forEach(error => {
        report.push(`行 ${error.row}, ${error.field}: ${error.message}`);
      });
      report.push('');
    }

    return report.join('\n');
  }

  // エラー修正提案の生成
  generateErrorFixSuggestions(result: CSVProcessResult): Array<{
    category: string;
    suggestions: string[];
  }> {
    const suggestions: Array<{ category: string; suggestions: string[] }> = [];

    if (result.validationResult?.errors.length) {
      const validationSuggestions = CSVValidator.suggestCorrections(result.validationResult.errors);
      if (validationSuggestions.length > 0) {
        suggestions.push({
          category: 'データ修正提案',
          suggestions: validationSuggestions.map(s => 
            `行 ${s.row}, ${s.column}: "${s.suggestedValue}" (理由: ${s.reason})`
          ).slice(0, 10)
        });
      }
    }

    // 一般的な修正提案
    const generalSuggestions: string[] = [];
    
    if (result.summary.parsing.error?.includes('CSVファイルが空')) {
      generalSuggestions.push('ヘッダー行とデータ行が含まれているファイルを使用してください');
    }
    
    if (result.summary.validation.errorCount > result.totalProcessed * 0.3) {
      generalSuggestions.push('エラー率が高いため、CSVテンプレートを使用してデータ形式を確認してください');
    }

    if (result.mappingResult?.errors.some(e => e.message.includes('タイムスタンプ'))) {
      generalSuggestions.push('タイムスタンプは "YYYY-MM-DD HH:mm:ss" 形式で入力してください');
    }

    if (generalSuggestions.length > 0) {
      suggestions.push({
        category: '一般的な改善提案',
        suggestions: generalSuggestions
      });
    }

    return suggestions;
  }
}