const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
  };

  try {
    const method = event.httpMethod;

    switch (method) {
      case 'GET':
        if (event.pathParameters && event.pathParameters.projectId) {
          return await getProject(event.pathParameters.projectId, headers);
        } else {
          return await getProjects(headers);
        }
      case 'POST':
        return await createProject(JSON.parse(event.body), headers);
      case 'PUT':
        return await updateProject(event.pathParameters.projectId, JSON.parse(event.body), headers);
      case 'DELETE':
        return await deleteProject(event.pathParameters.projectId, headers);
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
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

const getProjects = async (headers) => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Get projects - Not implemented yet' })
  };
};

const getProject = async (projectId, headers) => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: `Get project ${projectId} - Not implemented yet` })
  };
};

const createProject = async (projectData, headers) => {
  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({ message: 'Create project - Not implemented yet' })
  };
};

const updateProject = async (projectId, projectData, headers) => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: `Update project ${projectId} - Not implemented yet` })
  };
};

const deleteProject = async (projectId, headers) => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: `Delete project ${projectId} - Not implemented yet` })
  };
};