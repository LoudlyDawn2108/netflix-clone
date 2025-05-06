package com.streamflix.video.domain;

import com.streamflix.video.domain.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for managing User entities.
 */
public interface UserRepository extends JpaRepository<User, UUID> {
    
    /**
     * Find a user by username.
     *
     * @param username the username to search for
     * @return optional containing user if found
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Find a user by email address.
     *
     * @param email the email to search for
     * @return optional containing user if found
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Find a user by API key.
     *
     * @param apiKey the API key to search for
     * @return optional containing user if found
     */
    Optional<User> findByApiKey(String apiKey);
    
    /**
     * Check if a username exists.
     *
     * @param username the username to check
     * @return true if username exists
     */
    boolean existsByUsername(String username);
    
    /**
     * Check if an email exists.
     *
     * @param email the email to check
     * @return true if email exists
     */
    boolean existsByEmail(String email);
}