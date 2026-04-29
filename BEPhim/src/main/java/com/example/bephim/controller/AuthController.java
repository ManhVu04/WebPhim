package com.example.bephim.controller;

import com.example.bephim.dto.LoginRequest;
import com.example.bephim.dto.ForgotPasswordRequest;
import com.example.bephim.dto.RefreshTokenRequest;
import com.example.bephim.dto.RegisterRequest;
import com.example.bephim.dto.ChangePasswordRequest;
import com.example.bephim.dto.ResetPasswordRequest;
import com.example.bephim.model.User;
import com.example.bephim.service.RefreshTokenDenylistService;
import com.example.bephim.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Map;
import java.util.HexFormat;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder refreshTokenJwtDecoder;
    private final RefreshTokenDenylistService refreshTokenDenylistService;
    private final String issuer;
    private final String publicUrl;

    public AuthController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @Qualifier("refreshTokenJwtDecoder") JwtDecoder refreshTokenJwtDecoder,
            RefreshTokenDenylistService refreshTokenDenylistService,
            @Value("${app.auth.issuer}") String issuer,
            @Value("${app.public-url}") String publicUrl) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.refreshTokenJwtDecoder = refreshTokenJwtDecoder;
        this.refreshTokenDenylistService = refreshTokenDenylistService;
        this.issuer = issuer;
        this.publicUrl = publicUrl;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest body) {
        User user = userService.register(body.username(), body.email(), body.password(), body.displayName(), publicUrl);

        // Auto-login after register: issue tokens
        Map<String, Object> tokens = issueTokens(user);
        tokens.put("id", user.getId());
        tokens.put("username", user.getUsername());
        tokens.put("displayName", user.getDisplayName());
        tokens.put("email", user.getEmail());
        tokens.put("emailVerified", user.isEmailVerified());
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body) {
        String username = body.username();
        String password = body.password();

        User user = userService.findByUsername(username.trim().toLowerCase());
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        Map<String, Object> tokens = issueTokens(user);
        tokens.put("id", user.getId());
        tokens.put("username", user.getUsername());
        tokens.put("displayName", user.getDisplayName());
        tokens.put("email", user.getEmail());
        tokens.put("emailVerified", user.isEmailVerified());
        return ResponseEntity.ok(tokens);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        String username = jwt.getSubject();
        String displayName = jwt.getClaimAsString("displayName");
        String email = jwt.getClaimAsString("email");

        return ResponseEntity.ok(Map.of(
                "id", userId != null ? userId : "",
                "username", username != null ? username : "",
                "displayName", displayName != null ? displayName : "",
                "email", email != null ? email : "",
                "emailVerified", Boolean.TRUE.equals(jwt.getClaim("emailVerified"))
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshTokenRequest body) {
        String refreshToken = body.refreshToken();

        try {
            // Validate the refresh token
            Jwt decodedRefreshToken = refreshTokenJwtDecoder.decode(refreshToken);

            // Check if it's actually a refresh token
            String tokenType = decodedRefreshToken.getClaimAsString("tokenType");
            if (!"refresh".equals(tokenType)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid token type"));
            }

            String userId = decodedRefreshToken.getClaimAsString("userId");
            if (userId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid token: missing userId"));
            }

            // Find the user to get latest info and verify token version
            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            String refreshTokenKey = resolveRefreshTokenKey(refreshToken, decodedRefreshToken);

            Instant refreshExpiresAt = decodedRefreshToken.getExpiresAt();
            if (refreshExpiresAt == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid token: missing exp"));
            }

            // Verify refresh token version matches (invalidate old tokens if version changed)
            Integer tokenVersion = decodedRefreshToken.getClaimAsString("refreshTokenVersion") != null
                ? Integer.parseInt(decodedRefreshToken.getClaimAsString("refreshTokenVersion"))
                : 0;
            int userVersion = user.getRefreshTokenVersion();
            if (tokenVersion != userVersion) {
                return ResponseEntity.status(401).body(Map.of("error", "Token revoked"));
            }

            if (!refreshTokenDenylistService.consume(refreshTokenKey, user.getId(), refreshExpiresAt)) {
                return ResponseEntity.status(401).body(Map.of("error", "Refresh token already used"));
            }

            // Issue new tokens (version stays same since refresh successful)
            Map<String, Object> tokens = issueTokens(user);
            tokens.put("id", user.getId());
            tokens.put("username", user.getUsername());
            tokens.put("displayName", user.getDisplayName());
            tokens.put("email", user.getEmail());
            tokens.put("emailVerified", user.isEmailVerified());
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            // Token validation failed (expired, invalid signature, etc.)
            return ResponseEntity.status(401).body(Map.of("error", "Invalid refresh token"));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest body) {
        userService.requestPasswordReset(body.email(), publicUrl);
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest body) {
        try {
            userService.resetPassword(body.token(), body.newPassword());
            return ResponseEntity.ok(Map.of("message", "Password reset"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        try {
            userService.verifyEmail(token);
            return ResponseEntity.ok(Map.of("message", "Email verified"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/email/verification/resend")
    public ResponseEntity<?> resendEmailVerification(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }

        userService.resendEmailVerification(userId, publicUrl);
        return ResponseEntity.ok(Map.of("message", "Verification email sent"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest body) {
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }

        try {
            userService.changePassword(userId, body.currentPassword(), body.newPassword());
            return ResponseEntity.ok(Map.of("message", "Password changed"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/sessions/revoke")
    public ResponseEntity<?> revokeAllSessions(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }

        userService.revokeAllTokens(userId);
        return ResponseEntity.ok(Map.of("message", "Sessions revoked"));
    }

    private Map<String, Object> issueTokens(User user) {
        Instant now = Instant.now();

        // Access token (15 min)
        JwtClaimsSet.Builder accessClaimsBuilder = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("displayName", user.getDisplayName())
                .claim("emailVerified", user.isEmailVerified())
                .claim("roles", user.getRoles())
                .claim("tokenType", "access");
        if (user.getEmail() != null) {
            accessClaimsBuilder.claim("email", user.getEmail());
        }
        JwtClaimsSet accessClaims = accessClaimsBuilder.build();

        String accessToken = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), accessClaims)
        ).getTokenValue();

        // Refresh token (7 days) - include version for revocation
        JwtClaimsSet refreshClaims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(7, ChronoUnit.DAYS))
                .subject(user.getUsername())
                .id(UUID.randomUUID().toString())
                .claim("userId", user.getId())
                .claim("tokenType", "refresh")
                .claim("refreshTokenVersion", user.getRefreshTokenVersion())
                .build();

        String refreshToken = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), refreshClaims)
        ).getTokenValue();

        return new java.util.HashMap<>(Map.of(
                "accessToken", accessToken,
                "refreshToken", refreshToken,
                "expiresIn", 900 // 15 min in seconds
        ));
    }

    private static String resolveRefreshTokenKey(String rawRefreshToken, Jwt decodedRefreshToken) {
        String jti = decodedRefreshToken.getId();
        if (jti != null && !jti.isBlank()) {
            return "jti:" + jti;
        }
        return "fp:" + fingerprint(rawRefreshToken);
    }

    private static String fingerprint(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
