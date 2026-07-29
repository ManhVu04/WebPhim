package com.example.bephim.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Configuration
@Profile("prod")
class ProductionConfigValidation {

    @Bean
    ApplicationRunner validateProductionSettings(
            @Value("${app.auth.issuer}") String issuer,
            @Value("${app.public-url}") String publicUrl,
            @Value("${app.cors.allowed-origins}") String allowedOrigins,
            @Value("${app.auth.refresh-cookie.secure:false}") boolean refreshCookieSecure,
            @Value("${app.auth.refresh-cookie.same-site:Lax}") String refreshCookieSameSite) {
        validate(issuer, publicUrl, allowedOrigins, refreshCookieSecure, refreshCookieSameSite);
        return ignored -> {
        };
    }

    static void validate(
            String issuer,
            String publicUrl,
            String allowedOrigins,
            boolean refreshCookieSecure,
            String refreshCookieSameSite) {
        requireHttpsPublicUrl("APP_AUTH_ISSUER", issuer);
        requireHttpsPublicUrl("APP_PUBLIC_URL", publicUrl);
        parseOrigins(allowedOrigins).forEach(origin -> requireHttpsPublicUrl("APP_CORS_ALLOWED_ORIGINS", origin));
        if (!refreshCookieSecure) {
            throw new IllegalStateException("APP_AUTH_REFRESH_COOKIE_SECURE must be true in prod");
        }
        if ("none".equalsIgnoreCase(refreshCookieSameSite) && !refreshCookieSecure) {
            throw new IllegalStateException("SameSite=None requires a Secure refresh cookie");
        }
    }

    private static List<String> parseOrigins(String allowedOrigins) {
        List<String> origins = Arrays.stream((allowedOrigins == null ? "" : allowedOrigins).split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        if (origins.isEmpty()) {
            throw new IllegalStateException("APP_CORS_ALLOWED_ORIGINS must contain at least one prod origin");
        }
        return origins;
    }

    private static void requireHttpsPublicUrl(String name, String value) {
        URI uri;
        try {
            uri = URI.create(value == null ? "" : value.trim());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(name + " must be a valid HTTPS URL", exception);
        }
        String host = uri.getHost();
        if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null || isLocalHost(host)) {
            throw new IllegalStateException(name + " must be a public HTTPS URL");
        }
    }

    private static boolean isLocalHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return normalized.equals("localhost")
                || normalized.equals("127.0.0.1")
                || normalized.equals("::1")
                || normalized.endsWith(".localhost");
    }
}
