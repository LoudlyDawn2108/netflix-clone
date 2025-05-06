package com.streamflix.video.domain.model;

/**
 * Represents user roles within the system with specific permissions.
 * ADMIN: Full access to all operations
 * CONTENT_MANAGER: Can create, update, and manage video content
 * USER: Regular user with read-only access
 * SERVICE: Used for service-to-service authentication
 */
public enum Role {
    ADMIN,
    CONTENT_MANAGER,
    USER,
    SERVICE
}