package com.streamflix.video.infrastructure.security;

import com.streamflix.video.domain.UserRepository;
import com.streamflix.video.domain.model.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Filter to authenticate service-to-service calls using API keys.
 * This runs after the JwtAuthenticationFilter and provides an alternative
 * authentication method specifically for internal service communications.
 */
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(ApiKeyAuthFilter.class);
    private static final String API_KEY_HEADER = "X-API-Key";
    
    private final UserRepository userRepository;
    
    public ApiKeyAuthFilter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // Skip if already authenticated by JWT
        if (SecurityContextHolder.getContext().getAuthentication() != null && 
                SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // Extract API key from header
        String apiKey = request.getHeader(API_KEY_HEADER);
        if (apiKey == null || apiKey.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            // Try to authenticate with API key
            authenticateWithApiKey(apiKey);
        } catch (Exception e) {
            logger.error("Failed to authenticate with API key", e);
            // Continue with filter chain even if API key auth fails - JWT might work
        }
        
        filterChain.doFilter(request, response);
    }
    
    private void authenticateWithApiKey(String apiKey) {
        Optional<User> userOpt = userRepository.findByApiKey(apiKey);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            // Convert roles to Spring Security authorities
            List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.name()))
                    .collect(Collectors.toList());
            
            // Create authentication token
            SecurityUser securityUser = new SecurityUser(
                    user.getId().toString(),
                    user.getUsername(),
                    user.getPassword(),
                    authorities
            );
            
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(securityUser, null, authorities);
            
            // Set authentication in context
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            logger.debug("Service authenticated via API key: {}", user.getUsername());
        }
    }
}