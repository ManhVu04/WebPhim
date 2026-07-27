package com.example.bephim.service;

import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import com.example.bephim.repository.MailOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class EmailOutboxService {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxService.class);

    private final MailOutboxRepository repository;
    private final OutboxCryptoService cryptoService;
    private final EmailService emailService;

    public void enqueueEmailVerification(String to, String verificationUrl) {
        enqueue(new MailMessagePayload(to, "Verify your WebPhim email", """
                Welcome to WebPhim.

                Verify your email address:
                %s

                This link expires in 24 hours.
                """.formatted(verificationUrl)));
    }

    public void enqueuePasswordReset(String to, String resetUrl) {
        enqueue(new MailMessagePayload(to, "Reset your WebPhim password", """
                A password reset was requested for your WebPhim account.

                Reset your password:
                %s

                This link expires in 30 minutes. Ignore this email if you did not request it.
                """.formatted(resetUrl)));
    }

    private void enqueue(MailMessagePayload payload) {
        if (!emailService.isConfigured()) {
            log.warn("Mail is not configured; skipping outbox message '{}'", payload.subject());
            return;
        }
        if (!cryptoService.isConfigured()) {
            throw new IllegalStateException("Mail outbox encryption is not configured");
        }

        Instant now = Instant.now();
        MailOutboxEntry entry = new MailOutboxEntry();
        entry.setEncryptedPayload(cryptoService.encrypt(payload));
        entry.setStatus(MailOutboxStatus.PENDING);
        entry.setAttempts(0);
        entry.setNextAttemptAt(now);
        entry.setCreatedAt(now);
        repository.save(entry);
    }
}
