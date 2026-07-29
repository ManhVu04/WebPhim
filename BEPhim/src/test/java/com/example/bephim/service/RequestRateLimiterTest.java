package com.example.bephim.service;

import com.example.bephim.exception.RateLimitExceededException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RequestRateLimiterTest {

    @Test
    void rejectsRequestsAfterConfiguredWindowLimit() {
        RequestRateLimiter limiter = new RequestRateLimiter(1, 1, 1, 1, 1, 1, 1);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");

        limiter.checkProxy(request);

        assertThatThrownBy(() -> limiter.checkProxy(request))
                .isInstanceOfSatisfying(RateLimitExceededException.class,
                        error -> assertThat(error.getRetryAfterSeconds()).isBetween(1L, 60L));
    }

    @Test
    void keepsLoginCountersSeparateByNormalizedUsername() {
        RequestRateLimiter limiter = new RequestRateLimiter(1, 1, 1, 1, 1, 1, 10);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.11");

        limiter.checkLogin(request, "Alice");
        limiter.checkLogin(request, "Bob");

        assertThatThrownBy(() -> limiter.checkLogin(request, " alice "))
                .isInstanceOf(RateLimitExceededException.class);
    }
}
