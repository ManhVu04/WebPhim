package com.example.bephim;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
class BePhimApplicationTests {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Test
    void contextLoads() {
    }

    @Test
    void livenessEndpointReturnsHealthStatus() {
        ResponseEntity<Map> response = restTemplate.getForEntity("/actuator/health/liveness", Map.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsKey("status");
    }

    @Test
    void readinessEndpointReturnsHealthStatus() {
        ResponseEntity<Map> response = restTemplate.getForEntity("/actuator/health/readiness", Map.class);

        assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
        assertThat(response.getBody()).containsKey("status");
    }

    @Test
    void registerRejectsInvalidBody() {
        ResponseEntity<Map> response = postJson("/api/auth/register", "{\"username\":\"\",\"password\":\"123\"}");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "BAD_REQUEST");
        assertThat(response.getBody()).containsEntry("status", 400);
    }

    @Test
    void loginRejectsMissingPassword() {
        ResponseEntity<Map> response = postJson("/api/auth/login", "{\"username\":\"demo\"}");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "BAD_REQUEST");
        assertThat(response.getBody()).containsEntry("status", 400);
    }

    @Test
    void refreshRejectsMissingToken() {
        ResponseEntity<Map> response = postJson("/api/auth/refresh", "{}");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "BAD_REQUEST");
        assertThat(response.getBody()).containsEntry("status", 400);
    }

    @Test
    void favoriteRejectsMissingMovieSlug() {
        ResponseEntity<Map> response = authenticatedPostJson("/api/favorites", "{}");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "BAD_REQUEST");
        assertThat(response.getBody()).containsEntry("status", 400);
    }

    @Test
    void historyRejectsMissingMovieSlug() {
        ResponseEntity<Map> response = authenticatedPostJson("/api/history", "{}");

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("error", "BAD_REQUEST");
        assertThat(response.getBody()).containsEntry("status", 400);
    }

    private ResponseEntity<Map> postJson(String path, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    private ResponseEntity<Map> authenticatedPostJson(String path, String body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(accessToken());
        return restTemplate.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
    }

    private String accessToken() {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("http://localhost:8080")
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject("test-user")
                .claim("userId", "test-user-id")
                .claim("displayName", "Test User")
                .claim("roles", java.util.List.of("USER"))
                .claim("tokenType", "access")
                .build();

        return jwtEncoder.encode(
                JwtEncoderParameters.from(JwsHeader.with(SignatureAlgorithm.RS256).build(), claims)
        ).getTokenValue();
    }

}
