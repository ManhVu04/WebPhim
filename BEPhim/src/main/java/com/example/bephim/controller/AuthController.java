package com.example.bephim.controller;

import com.example.bephim.dto.ChangePasswordRequest;
import com.example.bephim.dto.ForgotPasswordRequest;
import com.example.bephim.dto.LoginRequest;
import com.example.bephim.dto.RegisterRequest;
import com.example.bephim.dto.ResetPasswordRequest;
import com.example.bephim.model.User;
import com.example.bephim.service.RefreshTokenDenylistService;
import com.example.bephim.service.UserService;
import com.example.bephim.service.RequestRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    static final String REFRESH_COOKIE = "webphim_refresh";
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder refreshTokenJwtDecoder;
    private final RefreshTokenDenylistService refreshTokenDenylistService;
    private final RequestRateLimiter requestRateLimiter;
    private final String issuer;
    private final String publicUrl;
    private final boolean refreshCookieSecure;
    private final String refreshCookieSameSite;

    public AuthController(
            UserService userService,
            PasswordEncoder passwordEncoder,
            JwtEncoder jwtEncoder,
            @Qualifier("refreshTokenJwtDecoder") JwtDecoder refreshTokenJwtDecoder,
            RefreshTokenDenylistService refreshTokenDenylistService,
            RequestRateLimiter requestRateLimiter,
            @Value("${app.auth.issuer}") String issuer,
            @Value("${app.public-url}") String publicUrl,
            @Value("${app.auth.refresh-cookie.secure:false}") boolean refreshCookieSecure,
            @Value("${app.auth.refresh-cookie.same-site:Lax}") String refreshCookieSameSite) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.refreshTokenJwtDecoder = refreshTokenJwtDecoder;
        this.refreshTokenDenylistService = refreshTokenDenylistService;
        this.requestRateLimiter = requestRateLimiter;
        this.issuer = issuer;
        this.publicUrl = publicUrl;
        this.refreshCookieSecure = refreshCookieSecure;
        this.refreshCookieSameSite = refreshCookieSameSite;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest body,
            HttpServletRequest request) {
        requestRateLimiter.checkRegister(request);
        User user = userService.register(body.username(), body.email(), body.password(), body.displayName(), publicUrl);
        return tokenResponse(user, issueTokens(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest body,
            HttpServletRequest request) {
        requestRateLimiter.checkLogin(request, body.username());
        User user = userService.findByUsername(body.username().trim().toLowerCase());
        if (user == null || !passwordEncoder.matches(body.password(), user.getPassword())) {
            return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Invalid username or password", 401));
        }
        return tokenResponse(user, issueTokens(user));
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(Map.of(
                "id", valueOrEmpty(jwt.getClaimAsString("userId")),
                "username", valueOrEmpty(jwt.getSubject()),
                "displayName", valueOrEmpty(jwt.getClaimAsString("displayName")),
                "email", valueOrEmpty(jwt.getClaimAsString("email")),
                "emailVerified", Boolean.TRUE.equals(jwt.getClaim("emailVerified")),
                "roles", rolesOrEmpty(jwt.getClaim("roles"))
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
            HttpServletRequest request) {
        requestRateLimiter.checkRefresh(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Refresh cookie is missing", 401));
        }

        try {
            Jwt decodedRefreshToken = refreshTokenJwtDecoder.decode(refreshToken);
            if (!"refresh".equals(decodedRefreshToken.getClaimAsString("tokenType"))) {
                return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Invalid token type", 401));
            }

            String userId = decodedRefreshToken.getClaimAsString("userId");
            Instant refreshExpiresAt = decodedRefreshToken.getExpiresAt();
            if (userId == null || refreshExpiresAt == null) {
                return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Invalid refresh token", 401));
            }

            User user = userService.findById(userId);
            if (user == null || tokenVersion(decodedRefreshToken) != user.getRefreshTokenVersion()) {
                return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Token revoked", 401));
            }

            String refreshTokenKey = resolveRefreshTokenKey(refreshToken, decodedRefreshToken);
            if (!refreshTokenDenylistService.consume(refreshTokenKey, user.getId(), refreshExpiresAt)) {
                return ResponseEntity.status(401).body(apiError("UNAUTHORIZED", "Refresh token already used", 401));
            }

            return tokenResponse(user, issueTokens(user));
        } catch (Exception ignored) {
            return ResponseEntity.status(401)
                    .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                    .body(apiError("UNAUTHORIZED", "Invalid refresh token", 401));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        consumeRefreshTokenIfValid(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(Map.of("message", "Logged out"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest body,
            HttpServletRequest request) {
        requestRateLimiter.checkForgotPassword(request, body.email());
        userService.requestPasswordReset(body.email(), publicUrl);
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link has been sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest body) {
        userService.resetPassword(body.token(), body.newPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(Map.of("message", "Password reset"));
    }

    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        userService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email verified"));
    }

    @PostMapping("/email/verification/resend")
    public ResponseEntity<?> resendEmailVerification(@AuthenticationPrincipal Jwt jwt) {
        String userId = requireUserId(jwt);
        requestRateLimiter.checkResendVerification(userId);
        userService.resendEmailVerification(userId, publicUrl);
        return ResponseEntity.ok(Map.of("message", "Verification email sent"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ChangePasswordRequest body) {
        userService.changePassword(requireUserId(jwt), body.currentPassword(), body.newPassword());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(Map.of("message", "Password changed"));
    }

    @PostMapping("/sessions/revoke")
    public ResponseEntity<?> revokeAllSessions(@AuthenticationPrincipal Jwt jwt) {
        userService.revokeAllTokens(requireUserId(jwt));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, clearRefreshCookie().toString())
                .body(Map.of("message", "Sessions revoked"));
    }

    private ResponseEntity<?> tokenResponse(User user, TokenPair tokens) {
        Map<String, Object> body = new HashMap<>();
        body.put("accessToken", tokens.accessToken());
        body.put("expiresIn", 900);
        body.put("id", user.getId());
        body.put("username", user.getUsername());
        body.put("displayName", user.getDisplayName());
        body.put("email", valueOrEmpty(user.getEmail()));
        body.put("emailVerified", user.isEmailVerified());
        body.put("roles", user.getRoles() == null ? List.of() : user.getRoles());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken()).toString())
                .body(body);
    }

    private TokenPair issueTokens(User user) {
        Instant now = Instant.now();
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

        String accessToken = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(),
                accessClaimsBuilder.build()
        )).getTokenValue();

        JwtClaimsSet refreshClaims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(REFRESH_TOKEN_TTL))
                .subject(user.getUsername())
                .id(UUID.randomUUID().toString())
                .claim("userId", user.getId())
                .claim("tokenType", "refresh")
                .claim("refreshTokenVersion", user.getRefreshTokenVersion())
                .build();

        String refreshToken = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(SignatureAlgorithm.RS256).build(),
                refreshClaims
        )).getTokenValue();
        return new TokenPair(accessToken, refreshToken);
    }

    private void consumeRefreshTokenIfValid(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        try {
            Jwt decoded = refreshTokenJwtDecoder.decode(refreshToken);
            Instant expiresAt = decoded.getExpiresAt();
            String userId = decoded.getClaimAsString("userId");
            if (expiresAt != null && userId != null) {
                refreshTokenDenylistService.consume(resolveRefreshTokenKey(refreshToken, decoded), userId, expiresAt);
            }
        } catch (Exception ignored) {
            // Logout remains idempotent even for expired or malformed cookies.
        }
    }

    private ResponseCookie refreshCookie(String token) {
        return ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth")
                .maxAge(REFRESH_TOKEN_TTL)
                .build();
    }

    private ResponseCookie clearRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(refreshCookieSecure)
                .sameSite(refreshCookieSameSite)
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();
    }

    private static int tokenVersion(Jwt token) {
        Object claim = token.getClaim("refreshTokenVersion");
        if (claim instanceof Number number) {
            return number.intValue();
        }
        return claim == null ? 0 : Integer.parseInt(claim.toString());
    }

    private static String requireUserId(Jwt jwt) {
        String userId = jwt == null ? null : jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Invalid token");
        }
        return userId;
    }

    private static Map<String, Object> apiError(String code, String message, int status) {
        return Map.of("error", code, "message", message, "status", status);
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private static Object rolesOrEmpty(Object roles) {
        return roles == null ? List.of() : roles;
    }

    private static String resolveRefreshTokenKey(String rawRefreshToken, Jwt decodedRefreshToken) {
        String jti = decodedRefreshToken.getId();
        return jti != null && !jti.isBlank() ? "jti:" + jti : "fp:" + fingerprint(rawRefreshToken);
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

    private record TokenPair(String accessToken, String refreshToken) {
    }
}
