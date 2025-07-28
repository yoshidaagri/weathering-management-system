"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerRepository = void 0;
const aws_sdk_1 = require("aws-sdk");
const uuid_1 = require("uuid");
const dynamodb = new aws_sdk_1.DynamoDB.DocumentClient();
/**
 * Customer Repository - DynamoDB Single Table Design
 *
 * Primary Table Keys:
 * PK: CUSTOMER#{customerId}
 * SK: METADATA
 *
 * GSI1 (Status + Company Name):
 * GSI1PK: CUSTOMER_STATUS#{status}
 * GSI1SK: COMPANY_NAME#{companyName}
 *
 * GSI2 (Industry + Created Date):
 * GSI2PK: INDUSTRY#{industry}
 * GSI2SK: CREATED_AT#{createdAt}
 */
class CustomerRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }
    /**
     * 顧客一覧取得（ページネーション、検索対応）
     */
    async findAll(query = {}) {
        try {
            const { limit = 20, nextToken, search, industry, status = 'active' } = query;
            const params = {
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': `CUSTOMER_STATUS#${status}`
                },
                Limit: limit
            };
            // ページネーション
            if (nextToken) {
                try {
                    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
                }
                catch (error) {
                    throw new Error('Invalid nextToken format');
                }
            }
            // フィルター条件の構築
            const filterExpressions = [];
            const attributeNames = {};
            const attributeValues = {
                ':gsi1pk': `CUSTOMER_STATUS#${status}`
            };
            // 検索フィルター（会社名）
            if (search) {
                filterExpressions.push('contains(companyName, :search)');
                attributeValues[':search'] = search;
            }
            // 業界フィルター
            if (industry) {
                filterExpressions.push('industry = :industry');
                attributeValues[':industry'] = industry;
            }
            if (filterExpressions.length > 0) {
                params.FilterExpression = filterExpressions.join(' AND ');
            }
            if (Object.keys(attributeNames).length > 0) {
                params.ExpressionAttributeNames = attributeNames;
            }
            params.ExpressionAttributeValues = attributeValues;
            const result = await dynamodb.query(params).promise();
            return {
                customers: result.Items?.map(this.entityToCustomer) || [],
                pagination: {
                    hasMore: !!result.LastEvaluatedKey,
                    nextToken: result.LastEvaluatedKey
                        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
                        : null,
                    count: result.Count || 0,
                    scannedCount: result.ScannedCount || 0
                }
            };
        }
        catch (error) {
            console.error('CustomerRepository.findAll error:', error);
            throw error;
        }
    }
    /**
     * 顧客詳細取得
     */
    async findById(customerId) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `CUSTOMER#${customerId}`,
                    SK: 'METADATA'
                }
            };
            const result = await dynamodb.get(params).promise();
            if (!result.Item) {
                return null;
            }
            return this.entityToCustomer(result.Item);
        }
        catch (error) {
            console.error('CustomerRepository.findById error:', error);
            throw error;
        }
    }
    /**
     * 業界別顧客取得
     */
    async findByIndustry(industry, limit = 20) {
        try {
            const params = {
                TableName: this.tableName,
                IndexName: 'GSI2',
                KeyConditionExpression: 'GSI2PK = :gsi2pk',
                ExpressionAttributeValues: {
                    ':gsi2pk': `INDUSTRY#${industry}`
                },
                Limit: limit,
                ScanIndexForward: false // 新しい順
            };
            const result = await dynamodb.query(params).promise();
            return result.Items?.map(this.entityToCustomer) || [];
        }
        catch (error) {
            console.error('CustomerRepository.findByIndustry error:', error);
            throw error;
        }
    }
    /**
     * 会社名で検索
     */
    async findByCompanyName(companyName) {
        try {
            const params = {
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK = :gsi1sk',
                ExpressionAttributeValues: {
                    ':gsi1pk': 'CUSTOMER_STATUS#active',
                    ':gsi1sk': `COMPANY_NAME#${companyName}`
                }
            };
            const result = await dynamodb.query(params).promise();
            if (!result.Items || result.Items.length === 0) {
                return null;
            }
            return this.entityToCustomer(result.Items[0]);
        }
        catch (error) {
            console.error('CustomerRepository.findByCompanyName error:', error);
            throw error;
        }
    }
    /**
     * 顧客作成
     */
    async create(customerData) {
        try {
            const customerId = (0, uuid_1.v4)();
            const now = new Date().toISOString();
            const status = customerData.status || 'active';
            const entity = {
                PK: `CUSTOMER#${customerId}`,
                SK: 'METADATA',
                GSI1PK: `CUSTOMER_STATUS#${status}`,
                GSI1SK: `COMPANY_NAME#${customerData.companyName}`,
                GSI2PK: `INDUSTRY#${customerData.industry}`,
                GSI2SK: `CREATED_AT#${now}`,
                customerId,
                companyName: customerData.companyName,
                contactInfo: customerData.contactInfo,
                industry: customerData.industry,
                projectCount: 0,
                status,
                createdAt: now,
                updatedAt: now
            };
            const params = {
                TableName: this.tableName,
                Item: entity,
                ConditionExpression: 'attribute_not_exists(PK)'
            };
            await dynamodb.put(params).promise();
            return this.entityToCustomer(entity);
        }
        catch (error) {
            if (error.code === 'ConditionalCheckFailedException') {
                throw new Error('Customer already exists');
            }
            console.error('CustomerRepository.create error:', error);
            throw error;
        }
    }
    /**
     * 顧客更新
     */
    async update(customerId, updateData) {
        try {
            // 既存レコードの確認
            const existing = await this.findById(customerId);
            if (!existing) {
                return null;
            }
            const now = new Date().toISOString();
            const updateExpression = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            // 動的な更新式を構築
            if (updateData.companyName !== undefined) {
                updateExpression.push('#companyName = :companyName');
                updateExpression.push('GSI1SK = :gsi1sk');
                expressionAttributeNames['#companyName'] = 'companyName';
                expressionAttributeValues[':companyName'] = updateData.companyName;
                expressionAttributeValues[':gsi1sk'] = `COMPANY_NAME#${updateData.companyName}`;
            }
            if (updateData.contactInfo !== undefined) {
                updateExpression.push('contactInfo = :contactInfo');
                expressionAttributeValues[':contactInfo'] = updateData.contactInfo;
            }
            if (updateData.industry !== undefined) {
                updateExpression.push('industry = :industry');
                updateExpression.push('GSI2PK = :gsi2pk');
                expressionAttributeValues[':industry'] = updateData.industry;
                expressionAttributeValues[':gsi2pk'] = `INDUSTRY#${updateData.industry}`;
            }
            if (updateData.status !== undefined) {
                updateExpression.push('#status = :status');
                updateExpression.push('GSI1PK = :gsi1pk');
                expressionAttributeNames['#status'] = 'status';
                expressionAttributeValues[':status'] = updateData.status;
                expressionAttributeValues[':gsi1pk'] = `CUSTOMER_STATUS#${updateData.status}`;
            }
            updateExpression.push('updatedAt = :updatedAt');
            expressionAttributeValues[':updatedAt'] = now;
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `CUSTOMER#${customerId}`,
                    SK: 'METADATA'
                },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            };
            const result = await dynamodb.update(params).promise();
            return this.entityToCustomer(result.Attributes);
        }
        catch (error) {
            console.error('CustomerRepository.update error:', error);
            throw error;
        }
    }
    /**
     * 顧客削除
     */
    async delete(customerId) {
        try {
            // 既存レコードの確認
            const existing = await this.findById(customerId);
            if (!existing) {
                return false;
            }
            // プロジェクト数チェック
            if (existing.projectCount > 0) {
                throw new Error(`Cannot delete customer with ${existing.projectCount} active projects`);
            }
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `CUSTOMER#${customerId}`,
                    SK: 'METADATA'
                }
            };
            await dynamodb.delete(params).promise();
            return true;
        }
        catch (error) {
            console.error('CustomerRepository.delete error:', error);
            throw error;
        }
    }
    /**
     * プロジェクト数増加
     */
    async incrementProjectCount(customerId) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `CUSTOMER#${customerId}`,
                    SK: 'METADATA'
                },
                UpdateExpression: 'ADD projectCount :inc SET updatedAt = :updatedAt',
                ExpressionAttributeValues: {
                    ':inc': 1,
                    ':updatedAt': new Date().toISOString()
                },
                ReturnValues: 'ALL_NEW'
            };
            const result = await dynamodb.update(params).promise();
            return this.entityToCustomer(result.Attributes);
        }
        catch (error) {
            console.error('CustomerRepository.incrementProjectCount error:', error);
            throw error;
        }
    }
    /**
     * プロジェクト数減少
     */
    async decrementProjectCount(customerId) {
        try {
            const params = {
                TableName: this.tableName,
                Key: {
                    PK: `CUSTOMER#${customerId}`,
                    SK: 'METADATA'
                },
                UpdateExpression: 'ADD projectCount :dec SET updatedAt = :updatedAt',
                ConditionExpression: 'projectCount > :zero',
                ExpressionAttributeValues: {
                    ':dec': -1,
                    ':zero': 0,
                    ':updatedAt': new Date().toISOString()
                },
                ReturnValues: 'ALL_NEW'
            };
            const result = await dynamodb.update(params).promise();
            return this.entityToCustomer(result.Attributes);
        }
        catch (error) {
            if (error.code === 'ConditionalCheckFailedException') {
                throw new Error('Cannot decrement project count below zero');
            }
            console.error('CustomerRepository.decrementProjectCount error:', error);
            throw error;
        }
    }
    /**
     * 統計情報取得
     */
    async getStatistics() {
        try {
            // アクティブ顧客数
            const activeParams = {
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': 'CUSTOMER_STATUS#active'
                },
                Select: 'COUNT'
            };
            // 非アクティブ顧客数
            const inactiveParams = {
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': 'CUSTOMER_STATUS#inactive'
                },
                Select: 'COUNT'
            };
            const [activeResult, inactiveResult] = await Promise.all([
                dynamodb.query(activeParams).promise(),
                dynamodb.query(inactiveParams).promise()
            ]);
            const activeCustomers = activeResult.Count || 0;
            const inactiveCustomers = inactiveResult.Count || 0;
            // 業界別統計（アクティブ顧客のみ）
            const industryParams = {
                TableName: this.tableName,
                IndexName: 'GSI1',
                KeyConditionExpression: 'GSI1PK = :gsi1pk',
                ExpressionAttributeValues: {
                    ':gsi1pk': 'CUSTOMER_STATUS#active'
                },
                ProjectionExpression: 'industry'
            };
            const industryResult = await dynamodb.query(industryParams).promise();
            const industryBreakdown = {};
            industryResult.Items?.forEach(item => {
                const industry = item.industry;
                industryBreakdown[industry] = (industryBreakdown[industry] || 0) + 1;
            });
            return {
                totalCustomers: activeCustomers + inactiveCustomers,
                activeCustomers,
                inactiveCustomers,
                industryBreakdown
            };
        }
        catch (error) {
            console.error('CustomerRepository.getStatistics error:', error);
            throw error;
        }
    }
    /**
     * エンティティから顧客オブジェクトへの変換
     */
    entityToCustomer(entity) {
        return {
            customerId: entity.customerId,
            companyName: entity.companyName,
            contactInfo: entity.contactInfo,
            industry: entity.industry,
            projectCount: entity.projectCount || 0,
            status: entity.status,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt
        };
    }
}
exports.CustomerRepository = CustomerRepository;
// TODO: Cursor - 受入テスト実施
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tZXItcmVwb3NpdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImN1c3RvbWVyLXJlcG9zaXRvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEscUNBQW1DO0FBQ25DLCtCQUFvQztBQUVwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGtCQUFRLENBQUMsY0FBYyxFQUFFLENBQUM7QUFrRS9DOzs7Ozs7Ozs7Ozs7OztHQWNHO0FBQ0gsTUFBYSxrQkFBa0I7SUFHN0IsWUFBWSxTQUFpQjtRQUMzQixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQTJCLEVBQUU7UUFDekMsSUFBSTtZQUNGLE1BQU0sRUFDSixLQUFLLEdBQUcsRUFBRSxFQUNWLFNBQVMsRUFDVCxNQUFNLEVBQ04sUUFBUSxFQUNSLE1BQU0sR0FBRyxRQUFRLEVBQ2xCLEdBQUcsS0FBSyxDQUFDO1lBRVYsTUFBTSxNQUFNLEdBQXVDO2dCQUNqRCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7Z0JBQ3pCLFNBQVMsRUFBRSxNQUFNO2dCQUNqQixzQkFBc0IsRUFBRSxrQkFBa0I7Z0JBQzFDLHlCQUF5QixFQUFFO29CQUN6QixTQUFTLEVBQUUsbUJBQW1CLE1BQU0sRUFBRTtpQkFDdkM7Z0JBQ0QsS0FBSyxFQUFFLEtBQUs7YUFDYixDQUFDO1lBRUYsV0FBVztZQUNYLElBQUksU0FBUyxFQUFFO2dCQUNiLElBQUk7b0JBQ0YsTUFBTSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUM1QyxDQUFDO2lCQUNIO2dCQUFDLE9BQU8sS0FBSyxFQUFFO29CQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztpQkFDN0M7YUFDRjtZQUVE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LGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTztnQkFDTCxjQUFjLEVBQUUsZUFBZSxHQUFHLGlCQUFpQjtnQkFDbkQsZUFBZTtnQkFDZixpQkFBaUI7Z0JBQ2pCLGlCQUFpQjthQUNsQixDQUFDO1NBQ0g7UUFBQyxPQUFPLEtBQUssRUFBRTtZQUNkLE9BQU8sQ0FBQyxLQUFLLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEUsTUFBTSxLQUFLLENBQUM7U0FDYjtJQUNILENBQUM7SUFFRDs7T0FFRztJQUNLLGdCQUFnQixDQUFDLE1BQXNCO1FBQzdDLE9BQU87WUFDTCxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7WUFDN0IsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSxNQUFNLENBQUMsV0FBVztZQUMvQixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksQ0FBQztZQUN0QyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQzNCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztTQUM1QixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBN2NELGdEQTZjQztBQUVELHlCQUF5QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCIH0gZnJvbSAnYXdzLXNkayc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5cclxuY29uc3QgZHluYW1vZGIgPSBuZXcgRHluYW1vREIuRG9jdW1lbnRDbGllbnQoKTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tZXIge1xyXG4gIGN1c3RvbWVySWQ6IHN0cmluZztcclxuICBjb21wYW55TmFtZTogc3RyaW5nO1xyXG4gIGNvbnRhY3RJbmZvOiB7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgcGhvbmU6IHN0cmluZztcclxuICAgIGFkZHJlc3M6IHN0cmluZztcclxuICB9O1xyXG4gIGluZHVzdHJ5OiBzdHJpbmc7XHJcbiAgcHJvamVjdENvdW50OiBudW1iZXI7XHJcbiAgc3RhdHVzOiAnYWN0aXZlJyB8ICdpbmFjdGl2ZSc7XHJcbiAgY3JlYXRlZEF0OiBzdHJpbmc7XHJcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tZXJFbnRpdHkgZXh0ZW5kcyBDdXN0b21lciB7XHJcbiAgUEs6IHN0cmluZztcclxuICBTSzogc3RyaW5nO1xyXG4gIEdTSTFQSzogc3RyaW5nO1xyXG4gIEdTSTFTSzogc3RyaW5nO1xyXG4gIEdTSTJQSzogc3RyaW5nO1xyXG4gIEdTSTJTSzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZUN1c3RvbWVyUmVxdWVzdCB7XHJcbiAgY29tcGFueU5hbWU6IHN0cmluZztcclxuICBjb250YWN0SW5mbzoge1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIHBob25lOiBzdHJpbmc7XHJcbiAgICBhZGRyZXNzOiBzdHJpbmc7XHJcbiAgfTtcclxuICBpbmR1c3RyeTogc3RyaW5nO1xyXG4gIHN0YXR1cz86ICdhY3RpdmUnIHwgJ2luYWN0aXZlJztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBVcGRhdGVDdXN0b21lclJlcXVlc3Qge1xyXG4gIGNvbXBhbnlOYW1lPzogc3RyaW5nO1xyXG4gIGNvbnRhY3RJbmZvPzoge1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIHBob25lOiBzdHJpbmc7XHJcbiAgICBhZGRyZXNzOiBzdHJpbmc7XHJcbiAgfTtcclxuICBpbmR1c3RyeT86IHN0cmluZztcclxuICBzdGF0dXM/OiAnYWN0aXZlJyB8ICdpbmFjdGl2ZSc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ3VzdG9tZXJMaXN0UXVlcnkge1xyXG4gIGxpbWl0PzogbnVtYmVyO1xyXG4gIG5leHRUb2tlbj86IHN0cmluZztcclxuICBzZWFyY2g/OiBzdHJpbmc7XHJcbiAgaW5kdXN0cnk/OiBzdHJpbmc7XHJcbiAgc3RhdHVzPzogJ2FjdGl2ZScgfCAnaW5hY3RpdmUnO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEN1c3RvbWVyTGlzdFJlc3BvbnNlIHtcclxuICBjdXN0b21lcnM6IEN1c3RvbWVyW107XHJcbiAgcGFnaW5hdGlvbjoge1xyXG4gICAgaGFzTW9yZTogYm9vbGVhbjtcclxuICAgIG5leHRUb2tlbjogc3RyaW5nIHwgbnVsbDtcclxuICAgIGNvdW50OiBudW1iZXI7XHJcbiAgICBzY2FubmVkQ291bnQ6IG51bWJlcjtcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQ3VzdG9tZXIgUmVwb3NpdG9yeSAtIER5bmFtb0RCIFNpbmdsZSBUYWJsZSBEZXNpZ25cclxuICogXHJcbiAqIFByaW1hcnkgVGFibGUgS2V5czpcclxuICogUEs6IENVU1RPTUVSI3tjdXN0b21lcklkfVxyXG4gKiBTSzogTUVUQURBVEFcclxuICogXHJcbiAqIEdTSTEgKFN0YXR1cyArIENvbXBhbnkgTmFtZSk6XHJcbiAqIEdTSTFQSzogQ1VTVE9NRVJfU1RBVFVTI3tzdGF0dXN9XHJcbiAqIEdTSTFTSzogQ09NUEFOWV9OQU1FI3tjb21wYW55TmFtZX1cclxuICogXHJcbiAqIEdTSTIgKEluZHVzdHJ5ICsgQ3JlYXRlZCBEYXRlKTpcclxuICogR1NJMlBLOiBJTkRVU1RSWSN7aW5kdXN0cnl9XHJcbiAqIEdTSTJTSzogQ1JFQVRFRF9BVCN7Y3JlYXRlZEF0fVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEN1c3RvbWVyUmVwb3NpdG9yeSB7XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IodGFibGVOYW1lOiBzdHJpbmcpIHtcclxuICAgIHRoaXMudGFibGVOYW1lID0gdGFibGVOYW1lO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICog6aGn5a6i5LiA6Kan5Y+W5b6X77yI44Oa44O844K444ON44O844K344On44Oz44CB5qSc57Si5a++5b+c77yJXHJcbiAgICovXHJcbiAgYXN5bmMgZmluZEFsbChxdWVyeTogQ3VzdG9tZXJMaXN0UXVlcnkgPSB7fSk6IFByb21pc2U8Q3VzdG9tZXJMaXN0UmVzcG9uc2U+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHtcclxuICAgICAgICBsaW1pdCA9IDIwLFxyXG4gICAgICAgIG5leHRUb2tlbixcclxuICAgICAgICBzZWFyY2gsXHJcbiAgICAgICAgaW5kdXN0cnksXHJcbiAgICAgICAgc3RhdHVzID0gJ2FjdGl2ZSdcclxuICAgICAgfSA9IHF1ZXJ5O1xyXG5cclxuICAgICAgY29uc3QgcGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5RdWVyeUlucHV0ID0ge1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnR1NJMScsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ0dTSTFQSyA9IDpnc2kxcGsnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6Z3NpMXBrJzogYENVU1RPTUVSX1NUQVRVUyMke3N0YXR1c31gXHJcbiAgICAgICAgfSxcclxuICAgICAgICBMaW1pdDogbGltaXRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIOODmuODvOOCuOODjeODvOOCt+ODp+ODs1xyXG4gICAgICBpZiAobmV4dFRva2VuKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIHBhcmFtcy5FeGNsdXNpdmVTdGFydEtleSA9IEpTT04ucGFyc2UoXHJcbiAgICAgICAgICAgIEJ1ZmZlci5mcm9tKG5leHRUb2tlbiwgJ2Jhc2U2NCcpLnRvU3RyaW5nKClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBuZXh0VG9rZW4gZm9ybWF0Jyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyDjg5XjgqPjg6vjgr/jg7zmnaHku7bjga7mp4vnr4lcclxuICAgICAgY29uc3QgZmlsdGVyRXhwcmVzc2lvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGNvbnN0IGF0dHJpYnV0ZU5hbWVzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge307XHJcbiAgICAgIGNvbnN0IGF0dHJpYnV0ZVZhbHVlczogeyBba2V5OiBzdHJpbmddOiBhbnkgfSA9IHtcclxuICAgICAgICAnOmdzaTFwayc6IGBDVVNUT01FUl9TVEFUVVMjJHtzdGF0dXN9YFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8g5qSc57Si44OV44Kj44Or44K/44O877yI5Lya56S+5ZCN77yJXHJcbiAgICAgIGlmIChzZWFyY2gpIHtcclxuICAgICAgICBmaWx0ZXJFeHByZXNzaW9ucy5wdXNoKCdjb250YWlucyhjb21wYW55TmFtZSwgOnNlYXJjaCknKTtcclxuICAgICAgICBhdHRyaWJ1dGVWYWx1ZXNbJzpzZWFyY2gnXSA9IHNlYXJjaDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8g5qWt55WM44OV44Kj44Or44K/44O8XHJcbiAgICAgIGlmIChpbmR1c3RyeSkge1xyXG4gICAgICAgIGZpbHRlckV4cHJlc3Npb25zLnB1c2goJ2luZHVzdHJ5ID0gOmluZHVzdHJ5Jyk7XHJcbiAgICAgICAgYXR0cmlidXRlVmFsdWVzWyc6aW5kdXN0cnknXSA9IGluZHVzdHJ5O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZmlsdGVyRXhwcmVzc2lvbnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHBhcmFtcy5GaWx0ZXJFeHByZXNzaW9uID0gZmlsdGVyRXhwcmVzc2lvbnMuam9pbignIEFORCAnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKE9iamVjdC5rZXlzKGF0dHJpYnV0ZU5hbWVzKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcGFyYW1zLkV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyA9IGF0dHJpYnV0ZU5hbWVzO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBwYXJhbXMuRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyA9IGF0dHJpYnV0ZVZhbHVlcztcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLnF1ZXJ5KHBhcmFtcykucHJvbWlzZSgpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjdXN0b21lcnM6IHJlc3VsdC5JdGVtcz8ubWFwKHRoaXMuZW50aXR5VG9DdXN0b21lcikgfHwgW10sXHJcbiAgICAgICAgcGFnaW5hdGlvbjoge1xyXG4gICAgICAgICAgaGFzTW9yZTogISFyZXN1bHQuTGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgICAgIG5leHRUb2tlbjogcmVzdWx0Lkxhc3RFdmFsdWF0ZWRLZXlcclxuICAgICAgICAgICAgPyBCdWZmZXIuZnJvbShKU09OLnN0cmluZ2lmeShyZXN1bHQuTGFzdEV2YWx1YXRlZEtleSkpLnRvU3RyaW5nKCdiYXNlNjQnKVxyXG4gICAgICAgICAgICA6IG51bGwsXHJcbiAgICAgICAgICBjb3VudDogcmVzdWx0LkNvdW50IHx8IDAsXHJcbiAgICAgICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdC5TY2FubmVkQ291bnQgfHwgMFxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5maW5kQWxsIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiDpoaflrqLoqbPntLDlj5blvpdcclxuICAgKi9cclxuICBhc3luYyBmaW5kQnlJZChjdXN0b21lcklkOiBzdHJpbmcpOiBQcm9taXNlPEN1c3RvbWVyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5HZXRJdGVtSW5wdXQgPSB7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIFBLOiBgQ1VTVE9NRVIjJHtjdXN0b21lcklkfWAsXHJcbiAgICAgICAgICBTSzogJ01FVEFEQVRBJ1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb2RiLmdldChwYXJhbXMpLnByb21pc2UoKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW0pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuZW50aXR5VG9DdXN0b21lcihyZXN1bHQuSXRlbSBhcyBDdXN0b21lckVudGl0eSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdDdXN0b21lclJlcG9zaXRvcnkuZmluZEJ5SWQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIOalreeVjOWIpemhp+WuouWPluW+l1xyXG4gICAqL1xyXG4gIGFzeW5jIGZpbmRCeUluZHVzdHJ5KGluZHVzdHJ5OiBzdHJpbmcsIGxpbWl0OiBudW1iZXIgPSAyMCk6IFByb21pc2U8Q3VzdG9tZXJbXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5RdWVyeUlucHV0ID0ge1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnR1NJMicsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ0dTSTJQSyA9IDpnc2kycGsnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6Z3NpMnBrJzogYElORFVTVFJZIyR7aW5kdXN0cnl9YFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgTGltaXQ6IGxpbWl0LFxyXG4gICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlIC8vIOaWsOOBl+OBhOmghlxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIucXVlcnkocGFyYW1zKS5wcm9taXNlKCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zPy5tYXAodGhpcy5lbnRpdHlUb0N1c3RvbWVyKSB8fCBbXTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5maW5kQnlJbmR1c3RyeSBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICog5Lya56S+5ZCN44Gn5qSc57SiXHJcbiAgICovXHJcbiAgYXN5bmMgZmluZEJ5Q29tcGFueU5hbWUoY29tcGFueU5hbWU6IHN0cmluZyk6IFByb21pc2U8Q3VzdG9tZXIgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXJhbXM6IER5bmFtb0RCLkRvY3VtZW50Q2xpZW50LlF1ZXJ5SW5wdXQgPSB7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBJbmRleE5hbWU6ICdHU0kxJyxcclxuICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnR1NJMVBLID0gOmdzaTFwayBBTkQgR1NJMVNLID0gOmdzaTFzaycsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzpnc2kxcGsnOiAnQ1VTVE9NRVJfU1RBVFVTI2FjdGl2ZScsXHJcbiAgICAgICAgICAnOmdzaTFzayc6IGBDT01QQU5ZX05BTUUjJHtjb21wYW55TmFtZX1gXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIucXVlcnkocGFyYW1zKS5wcm9taXNlKCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0aGlzLmVudGl0eVRvQ3VzdG9tZXIocmVzdWx0Lkl0ZW1zWzBdIGFzIEN1c3RvbWVyRW50aXR5KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5maW5kQnlDb21wYW55TmFtZSBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICog6aGn5a6i5L2c5oiQXHJcbiAgICovXHJcbiAgYXN5bmMgY3JlYXRlKGN1c3RvbWVyRGF0YTogQ3JlYXRlQ3VzdG9tZXJSZXF1ZXN0KTogUHJvbWlzZTxDdXN0b21lcj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY3VzdG9tZXJJZCA9IHV1aWR2NCgpO1xyXG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgIGNvbnN0IHN0YXR1cyA9IGN1c3RvbWVyRGF0YS5zdGF0dXMgfHwgJ2FjdGl2ZSc7XHJcblxyXG4gICAgICBjb25zdCBlbnRpdHk6IEN1c3RvbWVyRW50aXR5ID0ge1xyXG4gICAgICAgIFBLOiBgQ1VTVE9NRVIjJHtjdXN0b21lcklkfWAsXHJcbiAgICAgICAgU0s6ICdNRVRBREFUQScsXHJcbiAgICAgICAgR1NJMVBLOiBgQ1VTVE9NRVJfU1RBVFVTIyR7c3RhdHVzfWAsXHJcbiAgICAgICAgR1NJMVNLOiBgQ09NUEFOWV9OQU1FIyR7Y3VzdG9tZXJEYXRhLmNvbXBhbnlOYW1lfWAsXHJcbiAgICAgICAgR1NJMlBLOiBgSU5EVVNUUlkjJHtjdXN0b21lckRhdGEuaW5kdXN0cnl9YCxcclxuICAgICAgICBHU0kyU0s6IGBDUkVBVEVEX0FUIyR7bm93fWAsXHJcbiAgICAgICAgY3VzdG9tZXJJZCxcclxuICAgICAgICBjb21wYW55TmFtZTogY3VzdG9tZXJEYXRhLmNvbXBhbnlOYW1lLFxyXG4gICAgICAgIGNvbnRhY3RJbmZvOiBjdXN0b21lckRhdGEuY29udGFjdEluZm8sXHJcbiAgICAgICAgaW5kdXN0cnk6IGN1c3RvbWVyRGF0YS5pbmR1c3RyeSxcclxuICAgICAgICBwcm9qZWN0Q291bnQ6IDAsXHJcbiAgICAgICAgc3RhdHVzLFxyXG4gICAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbm93XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBwYXJhbXM6IER5bmFtb0RCLkRvY3VtZW50Q2xpZW50LlB1dEl0ZW1JbnB1dCA9IHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IGVudGl0eSxcclxuICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiAnYXR0cmlidXRlX25vdF9leGlzdHMoUEspJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXdhaXQgZHluYW1vZGIucHV0KHBhcmFtcykucHJvbWlzZSgpO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuZW50aXR5VG9DdXN0b21lcihlbnRpdHkpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgaWYgKGVycm9yLmNvZGUgPT09ICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ3VzdG9tZXIgYWxyZWFkeSBleGlzdHMnKTtcclxuICAgICAgfVxyXG4gICAgICBjb25zb2xlLmVycm9yKCdDdXN0b21lclJlcG9zaXRvcnkuY3JlYXRlIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiDpoaflrqLmm7TmlrBcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGUoY3VzdG9tZXJJZDogc3RyaW5nLCB1cGRhdGVEYXRhOiBVcGRhdGVDdXN0b21lclJlcXVlc3QpOiBQcm9taXNlPEN1c3RvbWVyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8g5pei5a2Y44Os44Kz44O844OJ44Gu56K66KqNXHJcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgdGhpcy5maW5kQnlJZChjdXN0b21lcklkKTtcclxuICAgICAgaWYgKCFleGlzdGluZykge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb246IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHt9O1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7IFtrZXk6IHN0cmluZ106IGFueSB9ID0ge307XHJcblxyXG4gICAgICAvLyDli5XnmoTjgarmm7TmlrDlvI/jgpLmp4vnr4lcclxuICAgICAgaWYgKHVwZGF0ZURhdGEuY29tcGFueU5hbWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnI2NvbXBhbnlOYW1lID0gOmNvbXBhbnlOYW1lJyk7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdHU0kxU0sgPSA6Z3NpMXNrJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjY29tcGFueU5hbWUnXSA9ICdjb21wYW55TmFtZSc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNvbXBhbnlOYW1lJ10gPSB1cGRhdGVEYXRhLmNvbXBhbnlOYW1lO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpnc2kxc2snXSA9IGBDT01QQU5ZX05BTUUjJHt1cGRhdGVEYXRhLmNvbXBhbnlOYW1lfWA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGVEYXRhLmNvbnRhY3RJbmZvICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2NvbnRhY3RJbmZvID0gOmNvbnRhY3RJbmZvJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNvbnRhY3RJbmZvJ10gPSB1cGRhdGVEYXRhLmNvbnRhY3RJbmZvO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodXBkYXRlRGF0YS5pbmR1c3RyeSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdpbmR1c3RyeSA9IDppbmR1c3RyeScpO1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnR1NJMlBLID0gOmdzaTJwaycpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzppbmR1c3RyeSddID0gdXBkYXRlRGF0YS5pbmR1c3RyeTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Z3NpMnBrJ10gPSBgSU5EVVNUUlkjJHt1cGRhdGVEYXRhLmluZHVzdHJ5fWA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh1cGRhdGVEYXRhLnN0YXR1cyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCcjc3RhdHVzID0gOnN0YXR1cycpO1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnR1NJMVBLID0gOmdzaTFwaycpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3N0YXR1cyddID0gJ3N0YXR1cyc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXR1cyddID0gdXBkYXRlRGF0YS5zdGF0dXM7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmdzaTFwayddID0gYENVU1RPTUVSX1NUQVRVUyMke3VwZGF0ZURhdGEuc3RhdHVzfWA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgndXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dXBkYXRlZEF0J10gPSBub3c7XHJcblxyXG4gICAgICBjb25zdCBwYXJhbXM6IER5bmFtb0RCLkRvY3VtZW50Q2xpZW50LlVwZGF0ZUl0ZW1JbnB1dCA9IHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleToge1xyXG4gICAgICAgICAgUEs6IGBDVVNUT01FUiMke2N1c3RvbWVySWR9YCxcclxuICAgICAgICAgIFNLOiAnTUVUQURBVEEnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBgU0VUICR7dXBkYXRlRXhwcmVzc2lvbi5qb2luKCcsICcpfWAsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBleHByZXNzaW9uQXR0cmlidXRlTmFtZXMsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIudXBkYXRlKHBhcmFtcykucHJvbWlzZSgpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHRoaXMuZW50aXR5VG9DdXN0b21lcihyZXN1bHQuQXR0cmlidXRlcyBhcyBDdXN0b21lckVudGl0eSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdDdXN0b21lclJlcG9zaXRvcnkudXBkYXRlIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiDpoaflrqLliYrpmaRcclxuICAgKi9cclxuICBhc3luYyBkZWxldGUoY3VzdG9tZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyDml6LlrZjjg6zjgrPjg7zjg4njga7norroqo1cclxuICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmZpbmRCeUlkKGN1c3RvbWVySWQpO1xyXG4gICAgICBpZiAoIWV4aXN0aW5nKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyDjg5fjg63jgrjjgqfjgq/jg4jmlbDjg4Hjgqfjg4Pjgq9cclxuICAgICAgaWYgKGV4aXN0aW5nLnByb2plY3RDb3VudCA+IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBkZWxldGUgY3VzdG9tZXIgd2l0aCAke2V4aXN0aW5nLnByb2plY3RDb3VudH0gYWN0aXZlIHByb2plY3RzYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHBhcmFtczogRHluYW1vREIuRG9jdW1lbnRDbGllbnQuRGVsZXRlSXRlbUlucHV0ID0ge1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7XHJcbiAgICAgICAgICBQSzogYENVU1RPTUVSIyR7Y3VzdG9tZXJJZH1gLFxyXG4gICAgICAgICAgU0s6ICdNRVRBREFUQSdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBhd2FpdCBkeW5hbW9kYi5kZWxldGUocGFyYW1zKS5wcm9taXNlKCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5kZWxldGUgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIOODl+ODreOCuOOCp+OCr+ODiOaVsOWil+WKoFxyXG4gICAqL1xyXG4gIGFzeW5jIGluY3JlbWVudFByb2plY3RDb3VudChjdXN0b21lcklkOiBzdHJpbmcpOiBQcm9taXNlPEN1c3RvbWVyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5VcGRhdGVJdGVtSW5wdXQgPSB7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIFBLOiBgQ1VTVE9NRVIjJHtjdXN0b21lcklkfWAsXHJcbiAgICAgICAgICBTSzogJ01FVEFEQVRBJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ0FERCBwcm9qZWN0Q291bnQgOmluYyBTRVQgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzppbmMnOiAxLFxyXG4gICAgICAgICAgJzp1cGRhdGVkQXQnOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9LFxyXG4gICAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9kYi51cGRhdGUocGFyYW1zKS5wcm9taXNlKCk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gdGhpcy5lbnRpdHlUb0N1c3RvbWVyKHJlc3VsdC5BdHRyaWJ1dGVzIGFzIEN1c3RvbWVyRW50aXR5KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5pbmNyZW1lbnRQcm9qZWN0Q291bnQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIOODl+ODreOCuOOCp+OCr+ODiOaVsOa4m+WwkVxyXG4gICAqL1xyXG4gIGFzeW5jIGRlY3JlbWVudFByb2plY3RDb3VudChjdXN0b21lcklkOiBzdHJpbmcpOiBQcm9taXNlPEN1c3RvbWVyIHwgbnVsbD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5VcGRhdGVJdGVtSW5wdXQgPSB7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBLZXk6IHtcclxuICAgICAgICAgIFBLOiBgQ1VTVE9NRVIjJHtjdXN0b21lcklkfWAsXHJcbiAgICAgICAgICBTSzogJ01FVEFEQVRBJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ0FERCBwcm9qZWN0Q291bnQgOmRlYyBTRVQgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgQ29uZGl0aW9uRXhwcmVzc2lvbjogJ3Byb2plY3RDb3VudCA+IDp6ZXJvJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmRlYyc6IC0xLFxyXG4gICAgICAgICAgJzp6ZXJvJzogMCxcclxuICAgICAgICAgICc6dXBkYXRlZEF0JzogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vZGIudXBkYXRlKHBhcmFtcykucHJvbWlzZSgpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHRoaXMuZW50aXR5VG9DdXN0b21lcihyZXN1bHQuQXR0cmlidXRlcyBhcyBDdXN0b21lckVudGl0eSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IuY29kZSA9PT0gJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZGVjcmVtZW50IHByb2plY3QgY291bnQgYmVsb3cgemVybycpO1xyXG4gICAgICB9XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0N1c3RvbWVyUmVwb3NpdG9yeS5kZWNyZW1lbnRQcm9qZWN0Q291bnQgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIOe1seioiOaDheWgseWPluW+l1xyXG4gICAqL1xyXG4gIGFzeW5jIGdldFN0YXRpc3RpY3MoKTogUHJvbWlzZTx7XHJcbiAgICB0b3RhbEN1c3RvbWVyczogbnVtYmVyO1xyXG4gICAgYWN0aXZlQ3VzdG9tZXJzOiBudW1iZXI7XHJcbiAgICBpbmFjdGl2ZUN1c3RvbWVyczogbnVtYmVyO1xyXG4gICAgaW5kdXN0cnlCcmVha2Rvd246IHsgW2luZHVzdHJ5OiBzdHJpbmddOiBudW1iZXIgfTtcclxuICB9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyDjgqLjgq/jg4bjgqPjg5bpoaflrqLmlbBcclxuICAgICAgY29uc3QgYWN0aXZlUGFyYW1zOiBEeW5hbW9EQi5Eb2N1bWVudENsaWVudC5RdWVyeUlucHV0ID0ge1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnR1NJMScsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ0dTSTFQSyA9IDpnc2kxcGsnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6Z3NpMXBrJzogJ0NVU1RPTUVSX1NUQVRVUyNhY3RpdmUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIOmdnuOCouOCr+ODhuOCo+ODlumhp+WuouaVsFxyXG4gICAgICBjb25zdCBpbmFjdGl2ZVBhcmFtczogRHluYW1vREIuRG9jdW1lbnRDbGllbnQuUXVlcnlJbnB1dCA9IHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0dTSTEnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdHU0kxUEsgPSA6Z3NpMXBrJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmdzaTFwayc6ICdDVVNUT01FUl9TVEFUVVMjaW5hY3RpdmUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBTZWxlY3Q6ICdDT1VOVCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IFthY3RpdmVSZXN1bHQsIGluYWN0aXZlUmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcclxuICAgICAgICBkeW5hbW9kYi5xdWVyeShhY3RpdmVQYXJhbXMpLnByb21pc2UoKSxcclxuICAgICAgICBkeW5hbW9kYi5xdWVyeShpbmFjdGl2ZVBhcmFtcykucHJvbWlzZSgpXHJcbiAgICAgIF0pO1xyXG5cclxuICAgICAgY29uc3QgYWN0aXZlQ3VzdG9tZXJzID0gYWN0aXZlUmVzdWx0LkNvdW50IHx8IDA7XHJcbiAgICAgIGNvbnN0IGluYWN0aXZlQ3VzdG9tZXJzID0gaW5hY3RpdmVSZXN1bHQuQ291bnQgfHwgMDtcclxuXHJcbiAgICAgIC8vIOalreeVjOWIpee1seioiO+8iOOCouOCr+ODhuOCo+ODlumhp+WuouOBruOBv++8iVxyXG4gICAgICBjb25zdCBpbmR1c3RyeVBhcmFtczogRHluYW1vREIuRG9jdW1lbnRDbGllbnQuUXVlcnlJbnB1dCA9IHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEluZGV4TmFtZTogJ0dTSTEnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdHU0kxUEsgPSA6Z3NpMXBrJyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmdzaTFwayc6ICdDVVNUT01FUl9TVEFUVVMjYWN0aXZlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgUHJvamVjdGlvbkV4cHJlc3Npb246ICdpbmR1c3RyeSdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGluZHVzdHJ5UmVzdWx0ID0gYXdhaXQgZHluYW1vZGIucXVlcnkoaW5kdXN0cnlQYXJhbXMpLnByb21pc2UoKTtcclxuICAgICAgY29uc3QgaW5kdXN0cnlCcmVha2Rvd246IHsgW2luZHVzdHJ5OiBzdHJpbmddOiBudW1iZXIgfSA9IHt9O1xyXG5cclxuICAgICAgaW5kdXN0cnlSZXN1bHQuSXRlbXM/LmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgY29uc3QgaW5kdXN0cnkgPSBpdGVtLmluZHVzdHJ5O1xyXG4gICAgICAgIGluZHVzdHJ5QnJlYWtkb3duW2luZHVzdHJ5XSA9IChpbmR1c3RyeUJyZWFrZG93bltpbmR1c3RyeV0gfHwgMCkgKyAxO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdG90YWxDdXN0b21lcnM6IGFjdGl2ZUN1c3RvbWVycyArIGluYWN0aXZlQ3VzdG9tZXJzLFxyXG4gICAgICAgIGFjdGl2ZUN1c3RvbWVycyxcclxuICAgICAgICBpbmFjdGl2ZUN1c3RvbWVycyxcclxuICAgICAgICBpbmR1c3RyeUJyZWFrZG93blxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignQ3VzdG9tZXJSZXBvc2l0b3J5LmdldFN0YXRpc3RpY3MgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIOOCqOODs+ODhuOCo+ODhuOCo+OBi+OCiemhp+WuouOCquODluOCuOOCp+OCr+ODiOOBuOOBruWkieaPm1xyXG4gICAqL1xyXG4gIHByaXZhdGUgZW50aXR5VG9DdXN0b21lcihlbnRpdHk6IEN1c3RvbWVyRW50aXR5KTogQ3VzdG9tZXIge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgY3VzdG9tZXJJZDogZW50aXR5LmN1c3RvbWVySWQsXHJcbiAgICAgIGNvbXBhbnlOYW1lOiBlbnRpdHkuY29tcGFueU5hbWUsXHJcbiAgICAgIGNvbnRhY3RJbmZvOiBlbnRpdHkuY29udGFjdEluZm8sXHJcbiAgICAgIGluZHVzdHJ5OiBlbnRpdHkuaW5kdXN0cnksXHJcbiAgICAgIHByb2plY3RDb3VudDogZW50aXR5LnByb2plY3RDb3VudCB8fCAwLFxyXG4gICAgICBzdGF0dXM6IGVudGl0eS5zdGF0dXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogZW50aXR5LmNyZWF0ZWRBdCxcclxuICAgICAgdXBkYXRlZEF0OiBlbnRpdHkudXBkYXRlZEF0XHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLy8gVE9ETzogQ3Vyc29yIC0g5Y+X5YWl44OG44K544OI5a6f5pa9Il19