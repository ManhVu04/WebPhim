package com.example.bephim.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/ophim")
public class OphimProxyController {

    private final RestClient ophimRestClient;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    public OphimProxyController(@Qualifier("ophimRestClient") RestClient ophimRestClient) {
        this.ophimRestClient = ophimRestClient;
    }

    @GetMapping("/**")
    public ResponseEntity<String> proxyGet(HttpServletRequest request) {
        // Incoming: /api/ophim/<path>?<query>
        // Target:   <baseUrl>/<path>?<query>
        String requestUri = request.getRequestURI(); // includes context path if any
        String prefix = request.getContextPath() + "/api/ophim";
        String path = requestUri.startsWith(prefix) ? requestUri.substring(prefix.length()) : "";
        if (!StringUtils.hasText(path)) path = "/";

        // IMPORTANT: nếu path bắt đầu bằng '/', RestClient sẽ coi như "absolute path"
        // và sẽ ghi đè path của baseUrl (làm rơi mất '/v1/api').
        String relativePath = path.startsWith("/") ? path.substring(1) : path;

        URI target = UriComponentsBuilder.fromPath(relativePath)
                .query(request.getQueryString())
                .build(true)
                .toUri();

        String cacheKey = relativePath + (request.getQueryString() == null ? "" : "?" + request.getQueryString());
        Duration ttl = ttlFor(relativePath);
        if (!ttl.isZero()) {
            CacheEntry hit = cache.get(cacheKey);
            if (hit != null && !hit.isExpired()) {
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .header(HttpHeaders.CACHE_CONTROL, "public, max-age=" + ttl.toSeconds())
                        .body(hit.body);
            }
        }

        String body;
        HttpStatusCode status = null;
        try {
            body = ophimRestClient.get()
                    .uri(target)
                    .retrieve()
                    .body(String.class);
        } catch (HttpStatusCodeException e) {
            // Trả nguyên status/body của upstream để FE xử lý đúng (không biến thành 500).
            status = e.getStatusCode();
            body = e.getResponseBodyAsString();
        }

        if (status == null) status = HttpStatusCode.valueOf(200);

        if (!ttl.isZero() && status.is2xxSuccessful()) {
            cache.put(cacheKey, new CacheEntry(body == null ? "" : body, System.currentTimeMillis(), ttl));
        }

        return ResponseEntity.status(status.value())
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.CACHE_CONTROL, !ttl.isZero() ? "public, max-age=" + ttl.toSeconds() : "no-store")
                .body(body == null ? "" : body);
    }

    private static Duration ttlFor(String relativePath) {
        // Cache các endpoint ít thay đổi / data nặng để giảm cảm giác "chậm chậm"
        if (relativePath == null) return Duration.ZERO;
        if (relativePath.startsWith("the-loai")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("quoc-gia")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("nam-phat-hanh")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("home")) return Duration.ofSeconds(20);
        if (relativePath.startsWith("tim-kiem")) return Duration.ofSeconds(10);
        if (relativePath.startsWith("phim/")) return Duration.ofMinutes(2); // detail khá nặng (episodes)
        return Duration.ZERO;
    }

    private record CacheEntry(String body, long createdAtMs, Duration ttl) {
        boolean isExpired() {
            return System.currentTimeMillis() - createdAtMs > ttl.toMillis();
        }
    }
}

