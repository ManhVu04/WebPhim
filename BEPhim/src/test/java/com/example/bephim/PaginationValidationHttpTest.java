package com.example.bephim;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.jwt.key-file=/tmp/webphim-test-jwt-rsa-key.jwk"
)
@AutoConfigureTestRestTemplate
class PaginationValidationHttpTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Test
    void favoritesRejectInvalidPaginationOverHttp() {
        assertBadPagination("/api/favorites?page=-1&size=101");
    }

    @Test
    void historyRejectInvalidPaginationOverHttp() {
        assertBadPagination("/api/history?page=-1&size=0");
    }

    @Test
    void commentsRejectInvalidPaginationOverHttp() {
        assertBadPagination("/api/comments?movieSlug=demo&page=-1&size=0");
    }

    private void assertBadPagination(String path) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken());
        ResponseEntity<Map> response = restTemplate.exchange(
                path,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                Map.class);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody())
                .containsEntry("error", "BAD_REQUEST")
                .containsEntry("status", 400);
    }

    private String accessToken() {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("http://localhost:8080")
                .issuedAt(now)
                .expiresAt(now.plus(15, ChronoUnit.MINUTES))
                .subject("test-user")
                .claim("userId", "test-user-id")
                .claim("roles", List.of("USER"))
                .claim("tokenType", "access")
                .build();
        return jwtEncoder.encode(
                JwtEncoderParameters.from(
                        JwsHeader.with(SignatureAlgorithm.RS256).build(),
                        claims)
        ).getTokenValue();
    }
}
