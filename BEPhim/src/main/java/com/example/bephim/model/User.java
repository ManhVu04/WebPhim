package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@Document("users")
public class User {
    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true, sparse = true)
    private String email;

    private boolean emailVerified = false;

    private String emailVerificationTokenHash;

    private Instant emailVerificationExpiresAt;

    private String passwordResetTokenHash;

    private Instant passwordResetExpiresAt;

    private String password;

    private String displayName;

    private List<String> roles;

    private Instant createdAt;

    // Token version - incrementing this invalidates all existing tokens
    private int refreshTokenVersion = 0;
}
