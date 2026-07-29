package com.example.bephim.service;

import com.example.bephim.exception.RateLimitExceededException;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

@Service
public class RequestRateLimiter {

    private final Cache<String, WindowCounter> counters = Caffeine.newBuilder()
            .maximumSize(100_000)
            .expireAfterAccess(2, TimeUnit.HOURS)
            .build();

    private final int loginLimit;
    private final int registerLimit;
    private final int forgotPasswordLimit;
    private final int resendVerificationLimit;
    private final int refreshLimit;
    private final int proxyLimit;
    private final int commentLimit;

    public RequestRateLimiter(
            @Value("${app.rate-limit.login-per-10-minutes:10}") int loginLimit,
            @Value("${app.rate-limit.register-per-hour:5}") int registerLimit,
            @Value("${app.rate-limit.forgot-password-per-hour:5}") int forgotPasswordLimit,
            @Value("${app.rate-limit.resend-verification-per-hour:3}") int resendVerificationLimit,
            @Value("${app.rate-limit.refresh-per-10-minutes:60}") int refreshLimit,
            @Value("${app.rate-limit.proxy-per-minute:120}") int proxyLimit,
            @Value("${app.rate-limit.comment-per-minute:5}") int commentLimit) {
        this.loginLimit = loginLimit;
        this.registerLimit = registerLimit;
        this.forgotPasswordLimit = forgotPasswordLimit;
        this.resendVerificationLimit = resendVerificationLimit;
        this.refreshLimit = refreshLimit;
        this.proxyLimit = proxyLimit;
        this.commentLimit = commentLimit;
    }

    public void checkLogin(HttpServletRequest request, String username) {
        check("login", clientAddress(request) + ":" + normalize(username), loginLimit, Duration.ofMinutes(10));
    }

    public void checkRegister(HttpServletRequest request) {
        check("register", clientAddress(request), registerLimit, Duration.ofHours(1));
    }

    public void checkForgotPassword(HttpServletRequest request, String email) {
        check("forgot", clientAddress(request) + ":" + normalize(email), forgotPasswordLimit, Duration.ofHours(1));
    }

    public void checkResendVerification(String userId) {
        check("resend", userId, resendVerificationLimit, Duration.ofHours(1));
    }

    public void checkRefresh(HttpServletRequest request) {
        check("refresh", clientAddress(request), refreshLimit, Duration.ofMinutes(10));
    }

    public void checkProxy(HttpServletRequest request) {
        check("proxy", clientAddress(request), proxyLimit, Duration.ofMinutes(1));
    }

    public void checkComment(String userId) {
        check("comment", userId, commentLimit, Duration.ofMinutes(1));
    }

    private void check(String scope, String identity, int limit, Duration window) {
        if (limit <= 0) {
            throw new IllegalStateException("Rate limit must be positive for " + scope);
        }

        long now = System.currentTimeMillis();
        long windowMillis = window.toMillis();
        String key = scope + ":" + identity;
        WindowCounter counter = counters.get(key, ignored -> new WindowCounter(now + windowMillis));

        synchronized (counter) {
            if (now >= counter.resetAtMillis) {
                counter.resetAtMillis = now + windowMillis;
                counter.count = 0;
            }
            if (counter.count >= limit) {
                long retryAfter = Math.max(1, (counter.resetAtMillis - now + 999) / 1000);
                throw new RateLimitExceededException(retryAfter);
            }
            counter.count++;
        }
    }

    private static String clientAddress(HttpServletRequest request) {
        String address = request.getRemoteAddr();
        return address == null || address.isBlank() ? "unknown" : address;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static final class WindowCounter {
        private int count;
        private long resetAtMillis;

        private WindowCounter(long resetAtMillis) {
            this.resetAtMillis = resetAtMillis;
        }
    }
}
