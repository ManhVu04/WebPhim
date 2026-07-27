package com.example.bephim.controller;

import com.example.bephim.service.RequestRateLimiter;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/ophim")
public class OphimProxyController {

    private static final int MAX_CACHE_KEY_LENGTH = 2_048;
    private static final int MAX_RESPONSE_BYTES = 4 * 1_024 * 1_024;
    private static final int MAX_CACHE_WEIGHT = 64 * 1_024 * 1_024;
    private static final int MIN_ENTRY_WEIGHT = MAX_CACHE_WEIGHT / 512;
    private static final int MAX_CONCURRENT_UPSTREAM = 32;

    private final RestClient ophimRestClient;
    private final RequestRateLimiter requestRateLimiter;
    private final Semaphore upstreamSlots = new Semaphore(MAX_CONCURRENT_UPSTREAM);
    private final ConcurrentHashMap<String, CompletableFuture<UpstreamResponse>> inFlight = new ConcurrentHashMap<>();
    private final Cache<String, CacheEntry> cache = Caffeine.newBuilder()
            .maximumWeight(MAX_CACHE_WEIGHT)
            .weigher((String key, CacheEntry value) -> Math.max(MIN_ENTRY_WEIGHT, value.bodyBytes()))
            .build();

    public OphimProxyController(
            @Qualifier("ophimRestClient") RestClient ophimRestClient,
            RequestRateLimiter requestRateLimiter) {
        this.ophimRestClient = ophimRestClient;
        this.requestRateLimiter = requestRateLimiter;
    }

    @GetMapping("/**")
    public ResponseEntity<String> proxyGet(HttpServletRequest request) {
        requestRateLimiter.checkProxy(request);

        String requestUri = request.getRequestURI();
        String prefix = request.getContextPath() + "/api/ophim";
        String path = requestUri.startsWith(prefix) ? requestUri.substring(prefix.length()) : "";
        if (!StringUtils.hasText(path)) {
            path = "/";
        }
        String relativePath = path.startsWith("/") ? path.substring(1) : path;
        URI target = UriComponentsBuilder.fromPath(relativePath)
                .query(request.getQueryString())
                .build(true)
                .toUri();

        String cacheKey = relativePath + (request.getQueryString() == null ? "" : "?" + request.getQueryString());
        Duration ttl = ttlFor(relativePath);
        boolean cacheable = !ttl.isZero() && cacheKey.length() <= MAX_CACHE_KEY_LENGTH;

        if (cacheable) {
            CacheEntry hit = cache.getIfPresent(cacheKey);
            if (hit != null && !hit.isExpired()) {
                return response(HttpStatus.OK.value(), hit.body(), ttl, "HIT");
            }
            if (hit != null) {
                cache.invalidate(cacheKey);
            }
        }

        UpstreamResponse upstream = cacheable
                ? fetchDeduplicated(cacheKey, target)
                : fetchUpstream(target);
        if (cacheable && upstream.status() >= 200 && upstream.status() < 300) {
            cache.put(cacheKey, new CacheEntry(
                    upstream.body(),
                    upstream.body().getBytes(StandardCharsets.UTF_8).length,
                    System.currentTimeMillis() + ttl.toMillis()
            ));
        }
        return response(upstream.status(), upstream.body(), ttl, "MISS");
    }

    private UpstreamResponse fetchDeduplicated(String key, URI target) {
        CompletableFuture<UpstreamResponse> created = new CompletableFuture<>();
        CompletableFuture<UpstreamResponse> existing = inFlight.putIfAbsent(key, created);
        if (existing != null) {
            try {
                return existing.join();
            } catch (CompletionException exception) {
                throw unwrap(exception);
            }
        }

        try {
            UpstreamResponse response = fetchUpstream(target);
            created.complete(response);
            return response;
        } catch (RuntimeException exception) {
            created.completeExceptionally(exception);
            throw exception;
        } finally {
            inFlight.remove(key, created);
        }
    }

    private UpstreamResponse fetchUpstream(URI target) {
        boolean acquired;
        try {
            acquired = upstreamSlots.tryAcquire(250, TimeUnit.MILLISECONDS);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return new UpstreamResponse(HttpStatus.SERVICE_UNAVAILABLE.value(), errorBody("Proxy interrupted"));
        }
        if (!acquired) {
            return new UpstreamResponse(HttpStatus.SERVICE_UNAVAILABLE.value(), errorBody("Proxy is busy"));
        }

        try {
            return ophimRestClient.get().uri(target).exchange((request, response) -> {
                byte[] body = response.getBody().readNBytes(MAX_RESPONSE_BYTES + 1);
                if (body.length > MAX_RESPONSE_BYTES) {
                    return new UpstreamResponse(
                            HttpStatus.BAD_GATEWAY.value(),
                            errorBody("Upstream response is too large")
                    );
                }
                return new UpstreamResponse(
                        response.getStatusCode().value(),
                        new String(body, StandardCharsets.UTF_8)
                );
            });
        } catch (ResourceAccessException exception) {
            int status = isTimeout(exception)
                    ? HttpStatus.GATEWAY_TIMEOUT.value()
                    : HttpStatus.BAD_GATEWAY.value();
            return new UpstreamResponse(status, errorBody(status == 504 ? "Upstream timed out" : "Upstream unavailable"));
        } catch (Exception exception) {
            return new UpstreamResponse(HttpStatus.BAD_GATEWAY.value(), errorBody("Upstream request failed"));
        } finally {
            upstreamSlots.release();
        }
    }

    private static ResponseEntity<String> response(int status, String body, Duration ttl, String cacheStatus) {
        boolean success = status >= 200 && status < 300;
        String cacheControl = success && !ttl.isZero()
                ? "public, max-age=" + ttl.toSeconds()
                : "no-store";
        return ResponseEntity.status(status)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header(HttpHeaders.CACHE_CONTROL, cacheControl)
                .header("X-Proxy-Cache", cacheStatus)
                .body(body == null ? "" : body);
    }

    private static boolean isTimeout(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof SocketTimeoutException || current instanceof HttpTimeoutException) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private static RuntimeException unwrap(CompletionException exception) {
        return exception.getCause() instanceof RuntimeException runtime ? runtime : exception;
    }

    private static String errorBody(String message) {
        return "{\"error\":\"UPSTREAM_ERROR\",\"message\":\"" + message + "\"}";
    }

    private static Duration ttlFor(String relativePath) {
        if (relativePath == null) return Duration.ZERO;
        if (relativePath.startsWith("the-loai")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("quoc-gia")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("nam-phat-hanh")) return Duration.ofMinutes(30);
        if (relativePath.startsWith("home")) return Duration.ofSeconds(20);
        if (relativePath.startsWith("tim-kiem")) return Duration.ofSeconds(10);
        if (relativePath.startsWith("danh-sach")) return Duration.ofSeconds(30);
        if (relativePath.startsWith("phim/")) return Duration.ofMinutes(2);
        return Duration.ZERO;
    }

    private record UpstreamResponse(int status, String body) {
    }

    private record CacheEntry(String body, int bodyBytes, long expiresAtMillis) {
        boolean isExpired() {
            return System.currentTimeMillis() >= expiresAtMillis;
        }
    }
}
