package com.streamflix.video.infrastructure.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Custom implementation of Spring Security's UserDetails to represent an authenticated user.
 * Used by both JWT and API key authentication.
 */
public class SecurityUser implements UserDetails {

    private final String id;
    private final String username;
    private final String password;
    private final Collection<? extends GrantedAuthority> authorities;
    private final boolean accountNonExpired;
    private final boolean accountNonLocked;
    private final boolean credentialsNonExpired;
    private final boolean enabled;

    /**
     * Constructor used by JwtAuthenticationFilter for JWT token authentication
     * @param username the username
     * @param roles list of roles
     * @param enabled whether the account is enabled
     */
    public SecurityUser(String username, List<String> roles, boolean enabled) {
        this(
            username, // Using username as ID since we don't have actual ID
            username,
            "", // No password for JWT auth
            roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toList()),
            true,
            true,
            true,
            enabled
        );
    }

    public SecurityUser(
            String id,
            String username,
            String password,
            Collection<? extends GrantedAuthority> authorities) {
        this(id, username, password, authorities, true, true, true, true);
    }

    public SecurityUser(
            String id,
            String username,
            String password,
            Collection<? extends GrantedAuthority> authorities,
            boolean accountNonExpired,
            boolean accountNonLocked,
            boolean credentialsNonExpired,
            boolean enabled) {

        this.id = id;
        this.username = username;
        this.password = password;
        this.authorities = authorities != null ? authorities : Collections.emptyList();
        this.accountNonExpired = accountNonExpired;
        this.accountNonLocked = accountNonLocked;
        this.credentialsNonExpired = credentialsNonExpired;
        this.enabled = enabled;
    }

    public String getId() {
        return id;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return accountNonExpired;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountNonLocked;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return credentialsNonExpired;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}