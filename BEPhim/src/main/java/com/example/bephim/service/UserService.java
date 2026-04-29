package com.example.bephim.service;

import com.example.bephim.model.User;
import com.example.bephim.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService implements UserDetailsService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        List<SimpleGrantedAuthority> authorities = user.getRoles() == null
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"))
                : user.getRoles().stream().map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList();

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPassword())
                .authorities(authorities)
                .build();
    }

    public User register(String username, String email, String password, String displayName, String publicUrl) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        String normalizedEmail = normalizeEmail(email);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (username == null || username.trim().length() < 3) {
            throw new IllegalArgumentException("Username must be at least 3 characters");
        }
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        User user = new User();
        user.setUsername(username.trim().toLowerCase());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(password));
        user.setDisplayName(displayName != null ? displayName.trim() : username);
        user.setRoles(List.of("USER"));
        user.setCreatedAt(Instant.now());
        String verificationToken = issueEmailVerificationToken(user);
        User saved = userRepository.save(user);
        emailService.sendEmailVerification(saved.getEmail(), buildUrl(publicUrl, "/xac-minh-email", verificationToken));
        return saved;
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username).orElse(null);
    }

    public User findById(String id) {
        return userRepository.findById(id).orElse(null);
    }

    public void changePassword(String userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setRefreshTokenVersion(user.getRefreshTokenVersion() + 1);
        userRepository.save(user);
    }

    public void requestPasswordReset(String email, String publicUrl) {
        userRepository.findByEmail(normalizeEmail(email)).ifPresent(user -> {
            String token = newToken();
            user.setPasswordResetTokenHash(hashToken(token));
            user.setPasswordResetExpiresAt(Instant.now().plus(30, ChronoUnit.MINUTES));
            userRepository.save(user);
            emailService.sendPasswordReset(user.getEmail(), buildUrl(publicUrl, "/dat-lai-mat-khau", token));
        });
    }

    public void resetPassword(String token, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        User user = userRepository.findByPasswordResetTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));
        if (user.getPasswordResetExpiresAt() == null || user.getPasswordResetExpiresAt().isBefore(Instant.now())) {
            clearPasswordReset(user);
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setRefreshTokenVersion(user.getRefreshTokenVersion() + 1);
        clearPasswordReset(user);
        userRepository.save(user);
    }

    public void verifyEmail(String token) {
        User user = userRepository.findByEmailVerificationTokenHash(hashToken(token))
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired verification token"));
        if (user.getEmailVerificationExpiresAt() == null || user.getEmailVerificationExpiresAt().isBefore(Instant.now())) {
            clearEmailVerification(user);
            userRepository.save(user);
            throw new IllegalArgumentException("Invalid or expired verification token");
        }

        user.setEmailVerified(true);
        clearEmailVerification(user);
        userRepository.save(user);
    }

    public void resendEmailVerification(String userId, String publicUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.isEmailVerified()) {
            return;
        }

        String token = issueEmailVerificationToken(user);
        User saved = userRepository.save(user);
        emailService.sendEmailVerification(saved.getEmail(), buildUrl(publicUrl, "/xac-minh-email", token));
    }

    /**
     * Revoke all existing tokens by incrementing the refresh token version.
     * This effectively logs out the user from all devices.
     */
    public void revokeAllTokens(String userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            int currentVersion = user.getRefreshTokenVersion();
            user.setRefreshTokenVersion(currentVersion + 1);
            userRepository.save(user);
        }
    }

    private static String issueEmailVerificationToken(User user) {
        String token = newToken();
        user.setEmailVerificationTokenHash(hashToken(token));
        user.setEmailVerificationExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        return token;
    }

    private static void clearEmailVerification(User user) {
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationExpiresAt(null);
    }

    private static void clearPasswordReset(User user) {
        user.setPasswordResetTokenHash(null);
        user.setPasswordResetExpiresAt(null);
    }

    private static String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        return email.trim().toLowerCase();
    }

    private static String buildUrl(String publicUrl, String path, String token) {
        String baseUrl = publicUrl == null || publicUrl.isBlank()
                ? "http://localhost:5173"
                : publicUrl.replaceAll("/+$", "");
        return baseUrl + path + "?token=" + token;
    }

    private static String newToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
