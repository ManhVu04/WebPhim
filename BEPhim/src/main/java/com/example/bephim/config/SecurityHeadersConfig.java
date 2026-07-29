package com.example.bephim.config;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class SecurityHeadersConfig {

    private static final Pattern FRAME_HOST_SPLIT = Pattern.compile("[,\\s]+");

    private static final List<String> DEFAULT_FRAME_HOSTS = List.of(
            "'self'"
    );

    private static final String CONTENT_SECURITY_POLICY = String.join("; ",
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://img.ophim.live https://img.ophim.cc https://wsrv.nl https://image.tmdb.org",
            "font-src 'self' data:",
            "media-src 'self' blob: https:",
            "worker-src 'self' blob:",
            "manifest-src 'self'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'");

    private static final String PERMISSIONS_POLICY = String.join(", ",
            "accelerometer=()",
            "camera=()",
            "display-capture=()",
            "geolocation=()",
            "gyroscope=()",
            "magnetometer=()",
            "microphone=()",
            "payment=()",
            "publickey-credentials-get=()",
            "usb=()",
            "xr-spatial-tracking=()");

    private SecurityHeadersConfig() {
    }

    static void applySecurityHeaders(
            HeadersConfigurer<HttpSecurity> headers,
            String allowedFrameHosts,
            boolean allowLocalhostConnect) {
        List<String> frameHosts = buildFrameSrc(allowedFrameHosts);
        String connectSrc = allowLocalhostConnect
                ? "connect-src 'self' http://localhost:* http://127.0.0.1:* https:"
                : "connect-src 'self' https:";
        // frame-src: allow embeds from any https source + configured hosts
        // frame-ancestors: 'self' only — prevent clickjacking by 3rd-party sites
        String policy = String.join("; ",
                CONTENT_SECURITY_POLICY,
                connectSrc,
                "frame-src https: " + String.join(" ", frameHosts),
                "frame-ancestors 'self'");

        headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(policy))
                .frameOptions(frameOptions -> frameOptions.sameOrigin())
                .referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", PERMISSIONS_POLICY));
    }

    private static List<String> buildFrameSrc(String allowedFrameHosts) {
        List<String> frameHosts = new ArrayList<>(DEFAULT_FRAME_HOSTS);
        if (StringUtils.hasText(allowedFrameHosts)) {
            for (String host : FRAME_HOST_SPLIT.split(allowedFrameHosts.trim())) {
                if (StringUtils.hasText(host)) {
                    frameHosts.add(host.trim());
                }
            }
        }
        return frameHosts;
    }
}
