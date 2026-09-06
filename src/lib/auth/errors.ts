/**
 * Authorization and Authentication Error Classes
 */

export class UnauthorizedError extends Error {
  public readonly statusCode = 401;
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public readonly statusCode = 403;
  constructor(message = 'Access forbidden: insufficient permissions') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  public readonly statusCode = 404;
  constructor(message = 'Requested resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class QuotaExceededError extends Error {
  public readonly statusCode = 429;
  constructor(message = 'Capability usage quota exceeded') {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message = 'Invalid request parameters') {
    super(message);
    this.name = 'ValidationError';
  }
}