package com.example.bephim.service;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OutboxCryptoServiceTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    void encryptedPayloadRoundTripsWithoutExposingMessage() {
        OutboxCryptoService crypto = new OutboxCryptoService(KEY, "smtp.example.com");
        MailMessagePayload payload = new MailMessagePayload(
                "user@example.com",
                "Sensitive subject",
                "https://example.com/reset?token=secret");

        String encrypted = crypto.encrypt(payload);

        assertThat(encrypted)
                .doesNotContain(payload.to())
                .doesNotContain("secret");
        assertThat(crypto.decrypt(encrypted)).isEqualTo(payload);
    }

    @Test
    void authenticatedEncryptionRejectsTampering() {
        OutboxCryptoService crypto = new OutboxCryptoService(KEY, "smtp.example.com");
        byte[] envelope = Base64.getDecoder().decode(
                crypto.encrypt(new MailMessagePayload("a@example.com", "subject", "body")));
        envelope[envelope.length - 1] ^= 1;

        assertThatThrownBy(() -> crypto.decrypt(Base64.getEncoder().encodeToString(envelope)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("decrypt");
    }

    @Test
    void smtpRequiresA256BitEncryptionKey() {
        assertThatThrownBy(() -> new OutboxCryptoService("", "smtp.example.com"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("APP_MAIL_OUTBOX_ENCRYPTION_KEY");
    }
}
