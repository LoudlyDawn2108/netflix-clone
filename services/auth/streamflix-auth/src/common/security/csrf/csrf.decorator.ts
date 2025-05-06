import { SetMetadata } from '@nestjs/common';

export const IS_CSRF_PROTECTED_KEY = 'isCsrfProtected';

/**
 * Marks an endpoint as protected by CSRF token validation
 * @returns Decorator function
 */
export const CsrfProtected = () => SetMetadata(IS_CSRF_PROTECTED_KEY, true);
