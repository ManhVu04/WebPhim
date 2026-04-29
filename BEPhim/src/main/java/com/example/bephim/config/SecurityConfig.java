package com.example.bephim.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
public class SecurityConfig {

    @Bean
    @Order(2)
    SecurityFilterChain defaultSecurityFilterChain(
            HttpSecurity http,
            CorsConfigurationSource corsConfigurationSource,
            @Qualifier("resourceServerJwtDecoder") JwtDecoder jwtDecoder,
            @Value("${app.security.csp.allowed-frame-hosts:}") String allowedFrameHosts) throws Exception {
        return http
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/ophim/**").permitAll()
                        .requestMatchers("/api/auth/register").permitAll()
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/api/auth/refresh").permitAll()
                        .requestMatchers("/api/auth/forgot-password").permitAll()
                        .requestMatchers("/api/auth/reset-password").permitAll()
                        .requestMatchers("/api/auth/verify-email").permitAll()
                        .requestMatchers("/api/auth/me").authenticated()
                        .requestMatchers("/api/auth/change-password").authenticated()
                        .requestMatchers("/api/auth/sessions/revoke").authenticated()
                        .requestMatchers("/api/auth/email/verification/resend").authenticated()
                        // Protected endpoints
                        .requestMatchers("/api/favorites/**").authenticated()
                        .requestMatchers("/api/history/**").authenticated()
                        // Allow everything else (OAuth2 endpoints, static, etc.)
                        .anyRequest().permitAll())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.decoder(jwtDecoder)))
                // Form login for OAuth2 Authorization Code flow
                .formLogin(form -> form
                        .loginPage("/login")
                        .permitAll())
                .headers(headers -> SecurityHeadersConfig.applySecurityHeaders(headers, allowedFrameHosts))
                .build();
    }
}
