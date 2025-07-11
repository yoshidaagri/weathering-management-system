import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDB.DocumentClient();

export interface Customer {
  customerId: string;
  companyName: string;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  industry: string;
  projectCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerEntity extends Customer {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
}

export interface CreateCustomerRequest {
  companyName: string;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  industry: string;
  status?: 'active' | 'inactive';
}

export interface UpdateCustomerRequest {
  companyName?: string;
  contactInfo?: {
    email: string;
    phone: string;
    address: string;
  };
  industry?: string;
  status?: 'active' | 'inactive';
}

export interface CustomerListQuery {
  limit?: number;
  nextToken?: string;
  search?: string;
  industry?: string;
  status?: 'active' | 'inactive';
}

export interface CustomerListResponse {
  customers: Customer[];
  pagination: {
    hasMore: boolean;
    nextToken: string | null;
    count: number;
    scannedCount: number;
  };
}

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
export class CustomerRepository {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * 顧客一覧取得（ページネーション、検索対応）
   */
  async findAll(query: CustomerListQuery = {}): Promise<CustomerListResponse> {
    try {
      const {
        limit = 20,
        nextToken,
        search,
        industry,
        status = 'active'
      } = query;

      const params: DynamoDB.DocumentClient.QueryInput = {
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
          params.ExclusiveStartKey = JSON.parse(
            Buffer.from(nextToken, 'base64').toString()
          );
        } catch (error) {
          throw new Error('Invalid nextToken format');
        }
      }

      // フィルター条件の構築
      const filterExpressions: string[] = [];
      const attributeNames: { [key: string]: string } = {};
      const attributeValues: { [key: string]: any } = {
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
    } catch (error) {
      console.error('CustomerRepository.findAll error:', error);
      throw error;
    }
  }

  /**
   * 顧客詳細取得
   */
  async findById(customerId: string): Promise<Customer | null> {
    try {
      const params: DynamoDB.DocumentClient.GetItemInput = {
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

      return this.entityToCustomer(result.Item as CustomerEntity);
    } catch (error) {
      console.error('CustomerRepository.findById error:', error);
      throw error;
    }
  }

  /**
   * 業界別顧客取得
   */
  async findByIndustry(industry: string, limit: number = 20): Promise<Customer[]> {
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
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
    } catch (error) {
      console.error('CustomerRepository.findByIndustry error:', error);
      throw error;
    }
  }

  /**
   * 会社名で検索
   */
  async findByCompanyName(companyName: string): Promise<Customer | null> {
    try {
      const params: DynamoDB.DocumentClient.QueryInput = {
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

      return this.entityToCustomer(result.Items[0] as CustomerEntity);
    } catch (error) {
      console.error('CustomerRepository.findByCompanyName error:', error);
      throw error;
    }
  }

  /**
   * 顧客作成
   */
  async create(customerData: CreateCustomerRequest): Promise<Customer> {
    try {
      const customerId = uuidv4();
      const now = new Date().toISOString();
      const status = customerData.status || 'active';

      const entity: CustomerEntity = {
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

      const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: this.tableName,
        Item: entity,
        ConditionExpression: 'attribute_not_exists(PK)'
      };

      await dynamodb.put(params).promise();

      return this.entityToCustomer(entity);
    } catch (error) {
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
  async update(customerId: string, updateData: UpdateCustomerRequest): Promise<Customer | null> {
    try {
      // 既存レコードの確認
      const existing = await this.findById(customerId);
      if (!existing) {
        return null;
      }

      const now = new Date().toISOString();
      const updateExpression: string[] = [];
      const expressionAttributeNames: { [key: string]: string } = {};
      const expressionAttributeValues: { [key: string]: any } = {};

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

      const params: DynamoDB.DocumentClient.UpdateItemInput = {
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
      
      return this.entityToCustomer(result.Attributes as CustomerEntity);
    } catch (error) {
      console.error('CustomerRepository.update error:', error);
      throw error;
    }
  }

  /**
   * 顧客削除
   */
  async delete(customerId: string): Promise<boolean> {
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

      const params: DynamoDB.DocumentClient.DeleteItemInput = {
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: 'METADATA'
        }
      };

      await dynamodb.delete(params).promise();
      
      return true;
    } catch (error) {
      console.error('CustomerRepository.delete error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト数増加
   */
  async incrementProjectCount(customerId: string): Promise<Customer | null> {
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
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
      
      return this.entityToCustomer(result.Attributes as CustomerEntity);
    } catch (error) {
      console.error('CustomerRepository.incrementProjectCount error:', error);
      throw error;
    }
  }

  /**
   * プロジェクト数減少
   */
  async decrementProjectCount(customerId: string): Promise<Customer | null> {
    try {
      const params: DynamoDB.DocumentClient.UpdateItemInput = {
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
      
      return this.entityToCustomer(result.Attributes as CustomerEntity);
    } catch (error) {
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
  async getStatistics(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    industryBreakdown: { [industry: string]: number };
  }> {
    try {
      // アクティブ顧客数
      const activeParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'CUSTOMER_STATUS#active'
        },
        Select: 'COUNT'
      };

      // 非アクティブ顧客数
      const inactiveParams: DynamoDB.DocumentClient.QueryInput = {
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
      const industryParams: DynamoDB.DocumentClient.QueryInput = {
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk',
        ExpressionAttributeValues: {
          ':gsi1pk': 'CUSTOMER_STATUS#active'
        },
        ProjectionExpression: 'industry'
      };

      const industryResult = await dynamodb.query(industryParams).promise();
      const industryBreakdown: { [industry: string]: number } = {};

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
    } catch (error) {
      console.error('CustomerRepository.getStatistics error:', error);
      throw error;
    }
  }

  /**
   * エンティティから顧客オブジェクトへの変換
   */
  private entityToCustomer(entity: CustomerEntity): Customer {
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

// TODO: Cursor - 受入テスト実施