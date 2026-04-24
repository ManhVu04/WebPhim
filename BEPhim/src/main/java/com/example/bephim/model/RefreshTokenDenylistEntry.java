package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("refresh_token_denylist")
public class RefreshTokenDenylistEntry {
    @Id
    private String tokenKey;

    private String userId;

    private Instant deniedAt;

    @Indexed(expireAfterSeconds = 0)
    private Instant expiresAt;
}
