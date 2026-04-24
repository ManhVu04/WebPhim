package com.example.bephim.service;

import com.example.bephim.model.RefreshTokenDenylistEntry;
import com.example.bephim.repository.RefreshTokenDenylistRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenDenylistServiceTest {

    @Mock
    private RefreshTokenDenylistRepository refreshTokenDenylistRepository;

    @InjectMocks
    private RefreshTokenDenylistService refreshTokenDenylistService;

    @Test
    void consumeStoresTokenJtiOnce() {
        Instant expiresAt = Instant.parse("2026-04-25T00:00:00Z");

        when(refreshTokenDenylistRepository.insert(any(RefreshTokenDenylistEntry.class)))
                .thenAnswer(invocation -> invocation.getArgument(0))
                .thenThrow(new DuplicateKeyException("duplicate"));

        boolean first = refreshTokenDenylistService.consume("jti-123", "user-1", expiresAt);
        boolean second = refreshTokenDenylistService.consume("jti-123", "user-1", expiresAt);

        assertTrue(first);
        assertFalse(second);

        ArgumentCaptor<RefreshTokenDenylistEntry> captor = ArgumentCaptor.forClass(RefreshTokenDenylistEntry.class);
        verify(refreshTokenDenylistRepository, times(2)).insert(captor.capture());
        List<RefreshTokenDenylistEntry> savedEntries = captor.getAllValues();
        RefreshTokenDenylistEntry saved = savedEntries.get(0);
        assertTrue(saved.getDeniedAt() != null);
        assertTrue("jti-123".equals(saved.getTokenKey()));
        assertTrue("user-1".equals(saved.getUserId()));
    }

    @Test
    void consumeReturnsFalseWhenRepositoryRejectsDuplicate() {
        doThrow(new DuplicateKeyException("duplicate"))
                .when(refreshTokenDenylistRepository)
                .insert(org.mockito.ArgumentMatchers.any(RefreshTokenDenylistEntry.class));

        boolean consumed = refreshTokenDenylistService.consume("jti-456", "user-2", Instant.now().plusSeconds(3600));

        assertFalse(consumed);
    }
}
