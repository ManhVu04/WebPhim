package com.example.bephim.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Set;
import java.util.UUID;

@Configuration
public class AuthorizationServerConfig {

    private static final Set<PosixFilePermission> OWNER_ONLY = Set.of(
            PosixFilePermission.OWNER_READ,
            PosixFilePermission.OWNER_WRITE
    );

    @Bean
    public JWKSource<SecurityContext> jwkSource(
            @Value("${app.jwt.key-file:${user.home}/.webphim/jwt-rsa-key.jwk}") String keyFile
    ) {
        RSAKey rsaKey = loadOrCreateRsaKey(Path.of(keyFile));
        return new ImmutableJWKSet<>(new JWKSet(rsaKey));
    }

    private static RSAKey loadOrCreateRsaKey(Path keyPath) {
        try {
            if (Files.exists(keyPath)) {
                enforceOwnerOnlyPermissions(keyPath);
                return RSAKey.parse(Files.readString(keyPath, StandardCharsets.UTF_8));
            }

            Path parent = keyPath.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }

            KeyPair keyPair = generateRsaKey();
            RSAKey rsaKey = new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
                    .privateKey((RSAPrivateKey) keyPair.getPrivate())
                    .keyID(UUID.randomUUID().toString())
                    .build();

            Files.createFile(keyPath);
            enforceOwnerOnlyPermissions(keyPath);
            Files.writeString(keyPath, rsaKey.toJSONString(), StandardCharsets.UTF_8);
            return rsaKey;
        } catch (Exception ex) {
            throw new IllegalStateException("Cannot securely load or create JWT signing key at " + keyPath, ex);
        }
    }

    private static void enforceOwnerOnlyPermissions(Path keyPath) throws Exception {
        if (!Files.getFileStore(keyPath).supportsFileAttributeView("posix")) {
            throw new IllegalStateException("JWT key filesystem does not support POSIX owner-only permissions");
        }
        Files.setPosixFilePermissions(keyPath, OWNER_ONLY);
        if (!Files.getPosixFilePermissions(keyPath).equals(OWNER_ONLY)) {
            throw new IllegalStateException("JWT signing key permissions must be 0600");
        }
    }

    private static KeyPair generateRsaKey() {
        try {
            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance("RSA");
            keyPairGenerator.initialize(2048);
            return keyPairGenerator.generateKeyPair();
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    @Bean
    public JwtDecoder refreshTokenJwtDecoder(
            JWKSource<SecurityContext> jwkSource,
            @Value("${app.auth.issuer}") String issuer) {
        return createJwtDecoder(jwkSource, issuer, "refresh");
    }

    @Bean
    public JwtDecoder resourceServerJwtDecoder(
            JWKSource<SecurityContext> jwkSource,
            @Value("${app.auth.issuer}") String issuer) {
        return createJwtDecoder(jwkSource, issuer, "access");
    }

    private static JwtDecoder createJwtDecoder(JWKSource<SecurityContext> jwkSource, String issuer, String tokenType) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSource(jwkSource).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuer),
                new JwtClaimValidator<>("tokenType", tokenType::equals)
        ));
        return decoder;
    }

    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
