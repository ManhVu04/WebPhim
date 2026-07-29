package com.example.bephim.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductionConfigValidationTest {

    @Test
    void acceptsPublicHttpsProductionSettings() {
        assertThatCode(() -> ProductionConfigValidation.validate(
                "https://webphim.example",
                "https://webphim.example",
                "https://webphim.example,https://www.webphim.example",
                true,
                "Lax"))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsLocalhostIssuerInProduction() {
        assertThatThrownBy(() -> ProductionConfigValidation.validate(
                "http://localhost:8080",
                "https://webphim.example",
                "https://webphim.example",
                true,
                "Lax"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_AUTH_ISSUER");
    }

    @Test
    void rejectsInsecureRefreshCookieInProduction() {
        assertThatThrownBy(() -> ProductionConfigValidation.validate(
                "https://webphim.example",
                "https://webphim.example",
                "https://webphim.example",
                false,
                "Lax"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_AUTH_REFRESH_COOKIE_SECURE");
    }
}
