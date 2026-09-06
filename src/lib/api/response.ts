import { NextResponse } from 'next/server';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  QuotaExceededError,
} from '../auth/errors.ts';

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
  if (error instanceof ValidationError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 429 });
  }

  console.error('[API Unhandled Error]:', error);
  const message = error instanceof Error ? error.message : 'Internal server error';
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}
