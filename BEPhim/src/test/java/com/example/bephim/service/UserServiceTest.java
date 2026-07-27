package com.example.bephim.service;

import com.example.bephim.model.User;
import com.example.bephim.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void registerChecksAndStoresTheSameNormalizedUsername() {
        UserRepository repository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        EmailOutboxService outboxService = mock(EmailOutboxService.class);
        UserService service = new UserService(repository, passwordEncoder, outboxService);

        when(repository.existsByUsername("alice")).thenReturn(false);
        when(repository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode("a-secure-password")).thenReturn("encoded");
        when(repository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = service.register(
                " Alice ",
                " Alice@Example.com ",
                "a-secure-password",
                null,
                "https://webphim.example");

        assertThat(user.getUsername()).isEqualTo("alice");
        assertThat(user.getEmail()).isEqualTo("alice@example.com");
        verify(repository).existsByUsername("alice");
        verify(outboxService).enqueueEmailVerification(
                eq("alice@example.com"),
                argThat(url -> url.startsWith(
                        "https://webphim.example/xac-minh-email?token=")));
    }
}
