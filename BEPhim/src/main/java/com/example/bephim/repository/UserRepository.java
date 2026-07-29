package com.example.bephim.repository;

import com.example.bephim.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationTokenHash(String emailVerificationTokenHash);
    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    Page<User> findByRolesContaining(String role, Pageable pageable);

    Page<User> findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
            String username, String email, String displayName, Pageable pageable);

    Page<User> findByRolesContainingAndUsernameContainingIgnoreCaseOrRolesContainingAndEmailContainingIgnoreCaseOrRolesContainingAndDisplayNameContainingIgnoreCase(
            String role1, String username, String role2, String email, String role3, String displayName, Pageable pageable);

    long countByRolesContaining(String role);
}
