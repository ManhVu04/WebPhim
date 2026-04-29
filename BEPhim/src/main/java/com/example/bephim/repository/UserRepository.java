package com.example.bephim.repository;

import com.example.bephim.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationTokenHash(String emailVerificationTokenHash);
    Optional<User> findByPasswordResetTokenHash(String passwordResetTokenHash);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
