package com.streamflix.video.infrastructure.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Custom security expressions for use with Spring Security's @PreAuthorize annotations.
 */
@Component("security")
public class CustomSecurityExpressions {

    /**
     * Check if the current user is an administrator.
     *
     * @return true if user has ROLE_ADMIN authority
     */
    public boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return hasRole(authentication, "ROLE_ADMIN");
    }

    /**
     * Check if the current user is a content manager.
     *
     * @return true if user has ROLE_CONTENT_MANAGER authority
     */
    public boolean isContentManager() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return hasRole(authentication, "ROLE_CONTENT_MANAGER") || isAdmin();
    }

    /**
     * Check if current user is authorized as a service account.
     *
     * @return true if user has ROLE_SERVICE authority
     */
    public boolean isService() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return hasRole(authentication, "ROLE_SERVICE");
    }

    /**
     * Check if current user is the owner of the specified resource.
     *
     * @param resourceOwnerId the ID of the resource owner
     * @return true if current user is the owner or an admin
     */
    public boolean isOwner(String resourceOwnerId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Admins can access any resource
        if (hasRole(authentication, "ROLE_ADMIN")) {
            return true;
        }
        
        // Check if authenticated user is the resource owner
        return authentication.getName().equals(resourceOwnerId);
    }

    /**
     * Helper method to check if authentication has specified role.
     *
     * @param authentication the current authentication object
     * @param role the role to check for
     * @return true if the authentication has the specified role
     */
    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> authority.equals(role));
    }
}