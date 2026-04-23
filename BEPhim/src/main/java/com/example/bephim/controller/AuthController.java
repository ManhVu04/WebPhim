package com.example.bephim.controller;

import com.example.bephim.model.User;
import com.example.bephim.service.UserService;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final JwtDecoder jwtDecoder;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        String displayName = body.get("displayName");

        User user = userService.register(username, password, displayName);

        // Auto-login after register: issue tokens
        Map<String, Object> tokens = issueTokens(user);
        tokens.put("id", user.getId());
        tokens.put("username", user.getUsername());
        tokens.put("displayName", user.getDisplayName());
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password required"));
        }

        User user = userService.findByUsername(username.trim().toLowerCase());
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        Map<String, Object> tokens = issueTokens(user);
        tokens.put("id", user.getId());
        tokens.put("username", user.getUsername());
        tokens.put("displayName", user.getDisplayName());
        return ResponseEntity.ok(tokens);
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        String username = jwt.getSubject();
        String displayName = jwt.getClaimAsString("displayName");

        return ResponseEntity.ok(Map.of(
                "id", userId != null ? userId : "",
                "username", username != null ? username : "",
                "displayName", displayName != null ? displayName : ""
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "refreshToken required"));
        }

        try {
            // Validate the refresh token
            Jwt decodedRefreshToken = jwtDecoder.decode(refreshToken);

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

            // Verify refresh token version matches (invalidate old tokens if version changed)
            Integer tokenVersion = decodedRefreshToken.getClaimAsString("refreshTokenVersion") != null
                ? Integer.parseInt(decodedRefreshToken.getClaimAsString("refreshTokenVersion"))
                : 0;
            int userVersion = user.getRefreshTokenVersion();
            if (tokenVersion != userVersion) {
                return ResponseEntity.status(401).body(Map.of("error", "Token revoked"));
            }

            // Issue new tokens (version stays same since refresh successful)
            Map<String, Object> tokens = issueTokens(user);
            tokens.put("id", user.getId());
            tokens.put("username", user.getUsername());
            tokens.put("displayName", user.getDisplayName());
            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            // Token validation failed (expired, invalid signature, etc.)
            return ResponseEntity.status(401).body(Map.of("error", "Invalid refresh token"));
        }
    }

    private Map<String, Object> issueTokens(User user) {
        Instant now = Instant.now();

        // Access token (15 min)
        JwtClaimsSet accessClaims = JwtClaimsSet.builder()
                .issuer("http://localhost:8080")
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("displayName", user.getDisplayName())
                .claim("roles", user.getRoles())
                .claim("tokenType", "access")
                .build();

        String accessToken = jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), accessClaims)
        ).getTokenValue();

        // Refresh token (7 days) - include version for revocation
        JwtClaimsSet refreshClaims = JwtClaimsSet.builder()
                .issuer("http://localhost:8080")
                .issuedAt(now)
                .expiresAt(now.plus(7, ChronoUnit.DAYS))
                .subject(user.getUsername())
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
}
