package com.example.bephim.service;

import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import com.example.bephim.repository.MailOutboxRepository;
import com.mongodb.client.result.UpdateResult;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailOutboxService {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxService.class);

    private final MailOutboxRepository repository;
    private final MongoTemplate mongoTemplate;
    private final OutboxCryptoService cryptoService;
    private final EmailService emailService;

    public Page<MailOutboxEntry> listEntries(MailOutboxStatus statusFilter, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        if (statusFilter != null) {
            return repository.findByStatus(statusFilter, pageable);
        }
        return repository.findAll(pageable);
    }

    public RetryResult retryEntry(String id) {
        Query query = Query.query(Criteria.where("_id").is(id)
                .and("status").is(MailOutboxStatus.DEAD)
                .and("encryptedPayload").ne(null));
        UpdateResult result = mongoTemplate.updateFirst(query, retryUpdate(Instant.now()), MailOutboxEntry.class);
        if (result.getModifiedCount() > 0) return RetryResult.RETRIED;
        return repository.existsById(id) ? RetryResult.NOT_RETRYABLE : RetryResult.NOT_FOUND;
    }

    public int retryAllDead() {
        Instant now = Instant.now();
        Query query = Query.query(Criteria.where("status").is(MailOutboxStatus.DEAD)
                .and("encryptedPayload").ne(null));
        Update update = retryUpdate(now);
        return (int) mongoTemplate.updateMulti(query, update, MailOutboxEntry.class).getModifiedCount();
    }

    private static Update retryUpdate(Instant now) {
        return new Update()
                .set("status", MailOutboxStatus.PENDING)
                .set("attempts", 0)
                .set("nextAttemptAt", now)
                .unset("lockedUntil")
                .unset("lastError");
    }

    public boolean deleteEntry(String id) {
        var result = mongoTemplate.remove(Query.query(Criteria.where("_id").is(id)), MailOutboxEntry.class);
        return result.getDeletedCount() > 0;
    }

    public MailMessagePayload decryptPayloadSafe(MailOutboxEntry entry) {
        if (entry == null || entry.getEncryptedPayload() == null || !cryptoService.isConfigured()) {
            return null;
        }
        try {
            return cryptoService.decrypt(entry.getEncryptedPayload());
        } catch (Exception e) {
            log.warn("Failed to decrypt outbox payload for entry id {}: {}", entry.getId(), e.getMessage());
            return null;
        }
    }

    public Map<String, Long> getOutboxStats() {
        return Map.of(
                "pending", repository.countByStatus(MailOutboxStatus.PENDING),
                "sending", repository.countByStatus(MailOutboxStatus.SENDING),
                "sent", repository.countByStatus(MailOutboxStatus.SENT),
                "dead", repository.countByStatus(MailOutboxStatus.DEAD),
                "total", repository.count()
        );
    }

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

    public enum RetryResult {
        RETRIED,
        NOT_FOUND,
        NOT_RETRYABLE
    }
}
