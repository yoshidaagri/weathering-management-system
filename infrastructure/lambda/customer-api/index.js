const { CustomerRepository } = require('../shared/repositories/customer-repository');
const { validateAuth } = require('../shared/jwt-validator');

const TABLE_NAME = process.env.TABLE_NAME;
const customerRepository = new CustomerRepository(TABLE_NAME);

/**
 * Customer API Lambda関数
 * AWS Cognito認証付きCRUD操作
 */
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  // CORS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // JWT認証チェック（Cognito検証付き）
    const authResult = await validateAuth(event);
    if (!authResult.isValid) {
      console.log('Authentication failed:', authResult.message);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'Unauthorized',
          message: authResult.message 
        })
      };
    }

    // 認証成功 - ユーザー情報をログに記録
    console.log('Authenticated user:', authResult.user?.username || 'mock-user');

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const customerId = pathParameters.customerId;

    switch (method) {
      case 'GET':
        if (customerId) {
          return await getCustomer(customerId, headers);
        } else {
          return await getCustomers(event.queryStringParameters, headers);
        }
      case 'POST':
        return await createCustomer(JSON.parse(event.body || '{}'), headers);
      case 'PUT':
        if (!customerId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Customer ID required for update' })
          };
        }
        return await updateCustomer(customerId, JSON.parse(event.body || '{}'), headers);
      case 'DELETE':
        if (!customerId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Customer ID required for delete' })
          };
        }
        return await deleteCustomer(customerId, headers);
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// validateAuth function is now imported from jwt-validator module

/**
 * 顧客一覧取得（ページネーション、検索対応）
 */
const getCustomers = async (queryParams, headers) => {
  try {
    const query = {
      limit: parseInt(queryParams?.limit) || 20,
      nextToken: queryParams?.nextToken,
      search: queryParams?.search,
      industry: queryParams?.industry,
      status: queryParams?.status || 'active'
    };

    const result = await customerRepository.findAll(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Get customers error:', error);
    if (error.message === 'Invalid nextToken format') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    throw error;
  }
};

/**
 * 顧客詳細取得
 */
const getCustomer = async (customerId, headers) => {
  try {
    if (!validateCustomerId(customerId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid customer ID format' })
      };
    }

    const customer = await customerRepository.findById(customerId);

    if (!customer) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ customer })
    };
  } catch (error) {
    console.error('Get customer error:', error);
    throw error;
  }
};

/**
 * 顧客作成
 */
const createCustomer = async (customerData, headers) => {
  try {
    // バリデーション
    const validation = validateCustomerData(customerData);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: validation.errors 
        })
      };
    }

    const customer = await customerRepository.create(customerData);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        customer,
        message: 'Customer created successfully'
      })
    };
  } catch (error) {
    if (error.message === 'Customer already exists') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    console.error('Create customer error:', error);
    throw error;
  }
};

/**
 * 顧客更新
 */
const updateCustomer = async (customerId, customerData, headers) => {
  try {
    if (!validateCustomerId(customerId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid customer ID format' })
      };
    }

    // バリデーション
    const validation = validateCustomerData(customerData, true);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Validation failed',
          details: validation.errors 
        })
      };
    }

    const customer = await customerRepository.update(customerId, customerData);

    if (!customer) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        customer,
        message: 'Customer updated successfully'
      })
    };
  } catch (error) {
    console.error('Update customer error:', error);
    throw error;
  }
};

/**
 * 顧客削除
 */
const deleteCustomer = async (customerId, headers) => {
  try {
    if (!validateCustomerId(customerId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid customer ID format' })
      };
    }

    const deleted = await customerRepository.delete(customerId);

    if (!deleted) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Customer not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Customer deleted successfully',
        customerId 
      })
    };
  } catch (error) {
    if (error.message.includes('Cannot delete customer with')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    console.error('Delete customer error:', error);
    throw error;
  }
};

/**
 * 顧客データバリデーション
 */
const validateCustomerData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.companyName !== undefined) {
    if (!data.companyName || typeof data.companyName !== 'string' || data.companyName.length < 1 || data.companyName.length > 100) {
      errors.push('Company name must be 1-100 characters');
    }
  }

  if (!isUpdate || data.contactInfo !== undefined) {
    if (!data.contactInfo || typeof data.contactInfo !== 'object') {
      errors.push('Contact info is required');
    } else {
      const { email, phone, address } = data.contactInfo;
      
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
      }
      
      if (!phone || !/^[\d\-\+\(\)\s]{10,15}$/.test(phone)) {
        errors.push('Valid phone number is required (10-15 digits)');
      }
      
      if (!address || typeof address !== 'string' || address.length < 1 || address.length > 200) {
        errors.push('Address must be 1-200 characters');
      }
    }
  }

  if (!isUpdate || data.industry !== undefined) {
    if (!data.industry || typeof data.industry !== 'string' || data.industry.length < 1 || data.industry.length > 50) {
      errors.push('Industry must be 1-50 characters');
    }
  }

  if (data.status !== undefined) {
    if (!['active', 'inactive'].includes(data.status)) {
      errors.push('Status must be active or inactive');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 顧客ID形式バリデーション
 */
const validateCustomerId = (customerId) => {
  return customerId && typeof customerId === 'string' && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId);
};


// TODO: Cursor - 受入テスト実施