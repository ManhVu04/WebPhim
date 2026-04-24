package com.example.bephim.service;

import com.example.bephim.model.RefreshTokenDenylistEntry;
import com.example.bephim.repository.RefreshTokenDenylistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class RefreshTokenDenylistService {

    private final RefreshTokenDenylistRepository refreshTokenDenylistRepository;

    public boolean consume(String tokenKey, String userId, Instant expiresAt) {
        if (tokenKey == null || tokenKey.isBlank() || expiresAt == null) {
            return false;
        }

        RefreshTokenDenylistEntry entry = new RefreshTokenDenylistEntry();
        entry.setTokenKey(tokenKey);
        entry.setUserId(userId);
        entry.setDeniedAt(Instant.now());
        entry.setExpiresAt(expiresAt);

        try {
            refreshTokenDenylistRepository.insert(entry);
            return true;
        } catch (DuplicateKeyException ex) {
            return false;
        }
    }
}
