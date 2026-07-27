package com.example.bephim.controller;

import com.example.bephim.service.RequestRateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.SocketTimeoutException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OphimProxyControllerTest {

    private MockRestServiceServer server;
    private OphimProxyController controller;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://ophim.example/v1/api/");
        server = MockRestServiceServer.bindTo(builder).build();
        RequestRateLimiter limiter = new RequestRateLimiter(100, 100, 100, 100, 100, 100);
        controller = new OphimProxyController(builder.build(), limiter);
    }

    @Test
    void cachesSuccessfulResponsesAndDeduplicatesTheSecondCall() {
        server.expect(once(), requestTo("https://ophim.example/v1/api/home"))
                .andRespond(withSuccess("{\"items\":[]}", MediaType.APPLICATION_JSON));

        ResponseEntity<String> first = controller.proxyGet(request("/api/ophim/home"));
        ResponseEntity<String> second = controller.proxyGet(request("/api/ophim/home"));

        assertThat(first.getStatusCode().value()).isEqualTo(200);
        assertThat(first.getHeaders().getFirst("X-Proxy-Cache")).isEqualTo("MISS");
        assertThat(second.getHeaders().getFirst("X-Proxy-Cache")).isEqualTo("HIT");
        assertThat(second.getBody()).isEqualTo("{\"items\":[]}");
        server.verify();
    }

    @Test
    void mapsTimeoutToGatewayTimeoutWithoutCacheHeaders() {
        server.expect(once(), requestTo("https://ophim.example/v1/api/home"))
                .andRespond(request -> {
                    throw new ResourceAccessException("timeout", new SocketTimeoutException("slow upstream"));
                });

        ResponseEntity<String> response = controller.proxyGet(request("/api/ophim/home"));

        assertThat(response.getStatusCode().value()).isEqualTo(504);
        assertThat(response.getHeaders().getCacheControl()).isEqualTo("no-store");
        server.verify();
    }

    private static MockHttpServletRequest request(String uri) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
        request.setRemoteAddr("192.0.2.20");
        return request;
    }
}
