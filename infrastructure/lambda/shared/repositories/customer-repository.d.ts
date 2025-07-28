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
export declare class CustomerRepository {
    private tableName;
    constructor(tableName: string);
    /**
     * 顧客一覧取得（ページネーション、検索対応）
     */
    findAll(query?: CustomerListQuery): Promise<CustomerListResponse>;
    /**
     * 顧客詳細取得
     */
    findById(customerId: string): Promise<Customer | null>;
    /**
     * 業界別顧客取得
     */
    findByIndustry(industry: string, limit?: number): Promise<Customer[]>;
    /**
     * 会社名で検索
     */
    findByCompanyName(companyName: string): Promise<Customer | null>;
    /**
     * 顧客作成
     */
    create(customerData: CreateCustomerRequest): Promise<Customer>;
    /**
     * 顧客更新
     */
    update(customerId: string, updateData: UpdateCustomerRequest): Promise<Customer | null>;
    /**
     * 顧客削除
     */
    delete(customerId: string): Promise<boolean>;
    /**
     * プロジェクト数増加
     */
    incrementProjectCount(customerId: string): Promise<Customer | null>;
    /**
     * プロジェクト数減少
     */
    decrementProjectCount(customerId: string): Promise<Customer | null>;
    /**
     * 統計情報取得
     */
    getStatistics(): Promise<{
        totalCustomers: number;
        activeCustomers: number;
        inactiveCustomers: number;
        industryBreakdown: {
            [industry: string]: number;
        };
    }>;
    /**
     * エンティティから顧客オブジェクトへの変換
     */
    private entityToCustomer;
}
