const { ProjectRepository } = require('../shared/repositories/project-repository');
const { CustomerRepository } = require('../shared/repositories/customer-repository');
const { validateAuth } = require('../shared/jwt-validator');

const TABLE_NAME = process.env.TABLE_NAME;
const projectRepository = new ProjectRepository(TABLE_NAME);
const customerRepository = new CustomerRepository(TABLE_NAME);

/**
 * Project API Lambda関数
 * 風化促進CO2除去プロジェクト管理API
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
    const projectId = pathParameters.projectId;

    switch (method) {
      case 'GET':
        if (projectId) {
          return await getProject(projectId, headers);
        } else {
          return await getProjects(event.queryStringParameters, headers);
        }
      case 'POST':
        return await createProject(JSON.parse(event.body || '{}'), headers);
      case 'PUT':
        if (!projectId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Project ID required for update' })
          };
        }
        return await updateProject(projectId, JSON.parse(event.body || '{}'), headers);
      case 'DELETE':
        if (!projectId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Project ID required for delete' })
          };
        }
        return await deleteProject(projectId, headers);
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
 * プロジェクト一覧取得（ページネーション、検索、フィルタ対応）
 */
const getProjects = async (queryParams, headers) => {
  try {
    const query = {
      limit: parseInt(queryParams?.limit) || 20,
      nextToken: queryParams?.nextToken,
      customerId: queryParams?.customerId,
      status: queryParams?.status,
      search: queryParams?.search
    };

    const result = await projectRepository.findAll(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Get projects error:', error);
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
 * プロジェクト詳細取得
 */
const getProject = async (projectId, headers) => {
  try {
    if (!validateProjectId(projectId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID format' })
      };
    }

    const project = await projectRepository.findById(projectId);

    if (!project) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ project })
    };
  } catch (error) {
    console.error('Get project error:', error);
    throw error;
  }
};

/**
 * プロジェクト作成
 */
const createProject = async (projectData, headers) => {
  try {
    // バリデーション
    const validation = validateProjectData(projectData);
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

    // 顧客の存在確認
    const customer = await customerRepository.findById(projectData.customerId);
    if (!customer) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Customer not found' })
      };
    }

    // ビジネスルール検証
    const businessRuleValidation = await validateBusinessRules(projectData);
    if (!businessRuleValidation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Business rule validation failed',
          details: businessRuleValidation.errors 
        })
      };
    }

    const project = await projectRepository.create(projectData);

    // 顧客のプロジェクト数増加
    await customerRepository.incrementProjectCount(projectData.customerId);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        project,
        message: 'Project created successfully'
      })
    };
  } catch (error) {
    if (error.message === 'Project already exists') {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: error.message })
      };
    }
    console.error('Create project error:', error);
    throw error;
  }
};

/**
 * プロジェクト更新
 */
const updateProject = async (projectId, projectData, headers) => {
  try {
    if (!validateProjectId(projectId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID format' })
      };
    }

    // バリデーション
    const validation = validateProjectData(projectData, true);
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

    // ステータス遷移ルール検証
    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      };
    }

    if (projectData.status) {
      const statusValidation = validateStatusTransition(existing.status, projectData.status);
      if (!statusValidation.isValid) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid status transition',
            details: statusValidation.errors 
          })
        };
      }
    }

    const project = await projectRepository.update(projectId, projectData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        project,
        message: 'Project updated successfully'
      })
    };
  } catch (error) {
    console.error('Update project error:', error);
    throw error;
  }
};

/**
 * プロジェクト削除
 */
const deleteProject = async (projectId, headers) => {
  try {
    if (!validateProjectId(projectId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid project ID format' })
      };
    }

    const existing = await projectRepository.findById(projectId);
    if (!existing) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Project not found' })
      };
    }

    // 削除制限チェック
    if (existing.status === 'active') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot delete active project' })
      };
    }

    const deleted = await projectRepository.delete(projectId);

    if (deleted) {
      // 顧客のプロジェクト数減少
      await customerRepository.decrementProjectCount(existing.customerId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Project deleted successfully',
        projectId 
      })
    };
  } catch (error) {
    console.error('Delete project error:', error);
    throw error;
  }
};

/**
 * プロジェクトデータバリデーション
 */
const validateProjectData = (data, isUpdate = false) => {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== 'string' || data.name.length < 1 || data.name.length > 200) {
      errors.push('Project name must be 1-200 characters');
    }
  }

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string' || data.description.length < 1 || data.description.length > 1000) {
      errors.push('Project description must be 1-1000 characters');
    }
  }

  if (!isUpdate || data.customerId !== undefined) {
    if (!data.customerId || typeof data.customerId !== 'string' || 
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.customerId)) {
      errors.push('Valid customer ID is required');
    }
  }

  if (!isUpdate || data.siteLocation !== undefined) {
    if (!data.siteLocation || typeof data.siteLocation !== 'object') {
      errors.push('Site location is required');
    } else {
      const { latitude, longitude, address } = data.siteLocation;
      
      if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
        errors.push('Valid latitude is required (-90 to 90)');
      }
      
      if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
        errors.push('Valid longitude is required (-180 to 180)');
      }
      
      if (!address || typeof address !== 'string' || address.length < 1 || address.length > 300) {
        errors.push('Site address must be 1-300 characters');
      }
    }
  }

  if (!isUpdate || data.budget !== undefined) {
    if (typeof data.budget !== 'number' || data.budget < 0) {
      errors.push('Budget must be a positive number');
    }
  }

  if (!isUpdate || data.co2Target !== undefined) {
    if (typeof data.co2Target !== 'number' || data.co2Target < 0) {
      errors.push('CO2 target must be a positive number');
    }
  }

  if (!isUpdate || data.startDate !== undefined) {
    if (!data.startDate || typeof data.startDate !== 'string' || 
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.startDate)) {
      errors.push('Valid start date is required (ISO format)');
    }
  }

  if (!isUpdate || data.endDate !== undefined) {
    if (!data.endDate || typeof data.endDate !== 'string' || 
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data.endDate)) {
      errors.push('Valid end date is required (ISO format)');
    }
  }

  if (data.status !== undefined) {
    if (!['planning', 'active', 'completed', 'cancelled'].includes(data.status)) {
      errors.push('Status must be one of: planning, active, completed, cancelled');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * ビジネスルール検証
 */
const validateBusinessRules = async (projectData) => {
  const errors = [];

  // 顧客あたりのプロジェクト数制限
  try {
    const customerProjects = await projectRepository.findByCustomer(projectData.customerId);
    const activeProjects = customerProjects.filter(p => p.status === 'active' || p.status === 'planning');
    
    if (activeProjects.length >= 5) {
      errors.push('Customer cannot have more than 5 active projects');
    }
  } catch (error) {
    console.error('Business rule validation error:', error);
    errors.push('Unable to validate project count');
  }

  // 期間検証
  if (projectData.startDate && projectData.endDate) {
    const startDate = new Date(projectData.startDate);
    const endDate = new Date(projectData.endDate);
    
    if (startDate >= endDate) {
      errors.push('End date must be after start date');
    }
    
    const today = new Date();
    if (startDate < today) {
      errors.push('Start date cannot be in the past');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * ステータス遷移ルール検証
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    'planning': ['active', 'cancelled'],
    'active': ['completed', 'cancelled'],
    'completed': [], // 完了からは変更不可
    'cancelled': [] // キャンセルからは変更不可
  };

  const errors = [];
  
  if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
    errors.push(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * プロジェクトID形式バリデーション
 */
const validateProjectId = (projectId) => {
  return projectId && typeof projectId === 'string' && 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
};

// TODO: Cursor - 受入テスト実施