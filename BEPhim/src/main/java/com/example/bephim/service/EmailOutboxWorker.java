package com.example.bephim.service;

import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class EmailOutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxWorker.class);

    private final MongoTemplate mongoTemplate;
    private final OutboxCryptoService cryptoService;
    private final EmailService emailService;
    private final int maxAttempts;
    private final int batchSize;
    private final Counter sentCounter;
    private final Counter retryCounter;
    private final Counter deadCounter;

    public EmailOutboxWorker(
            MongoTemplate mongoTemplate,
            OutboxCryptoService cryptoService,
            EmailService emailService,
            MeterRegistry meterRegistry,
            @Value("${app.mail.outbox.max-attempts:8}") int maxAttempts,
            @Value("${app.mail.outbox.batch-size:20}") int batchSize) {
        this.mongoTemplate = mongoTemplate;
        this.cryptoService = cryptoService;
        this.emailService = emailService;
        this.maxAttempts = Math.max(1, maxAttempts);
        this.batchSize = Math.max(1, Math.min(batchSize, 100));
        this.sentCounter = meterRegistry.counter("mail.outbox.sent");
        this.retryCounter = meterRegistry.counter("mail.outbox.retry");
        this.deadCounter = meterRegistry.counter("mail.outbox.dead");
    }

    @Scheduled(fixedDelayString = "${app.mail.outbox.poll-interval:30s}")
    public void deliverPendingMail() {
        if (!emailService.isConfigured() || !cryptoService.isConfigured()) {
            return;
        }

        for (int i = 0; i < batchSize; i++) {
            MailOutboxEntry entry = claimNext();
            if (entry == null) {
                return;
            }
            deliver(entry);
        }
    }

    private MailOutboxEntry claimNext() {
        Instant now = Instant.now();
        Criteria eligible = new Criteria().orOperator(
                Criteria.where("status").is(MailOutboxStatus.PENDING)
                        .and("nextAttemptAt").lte(now),
                Criteria.where("status").is(MailOutboxStatus.SENDING)
                        .and("lockedUntil").lte(now));
        Query query = Query.query(eligible)
                .with(Sort.by(Sort.Direction.ASC, "nextAttemptAt"));
        Update update = new Update()
                .set("status", MailOutboxStatus.SENDING)
                .set("lockedUntil", now.plus(Duration.ofMinutes(2)))
                .inc("attempts", 1);
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                MailOutboxEntry.class);
    }

    private void deliver(MailOutboxEntry entry) {
        try {
            emailService.send(cryptoService.decrypt(entry.getEncryptedPayload()));
            markSent(entry.getId());
            sentCounter.increment();
        } catch (RuntimeException e) {
            markFailed(entry, e);
        }
    }

    private void markSent(String id) {
        Query query = Query.query(Criteria.where("_id").is(id)
                .and("status").is(MailOutboxStatus.SENDING));
        Update update = new Update()
                .set("status", MailOutboxStatus.SENT)
                .set("sentAt", Instant.now())
                .unset("encryptedPayload")
                .unset("lockedUntil")
                .unset("lastError");
        mongoTemplate.updateFirst(query, update, MailOutboxEntry.class);
    }

    private void markFailed(MailOutboxEntry entry, RuntimeException error) {
        int attempts = entry.getAttempts();
        boolean dead = attempts >= maxAttempts;
        String message = error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
        if (message.length() > 500) {
            message = message.substring(0, 500);
        }

        Query query = Query.query(Criteria.where("_id").is(entry.getId())
                .and("status").is(MailOutboxStatus.SENDING));
        Update update = new Update()
                .set("status", dead ? MailOutboxStatus.DEAD : MailOutboxStatus.PENDING)
                .set("lastError", message)
                .unset("lockedUntil");
        if (!dead) {
            update.set("nextAttemptAt", Instant.now().plus(retryDelay(attempts)));
        }
        mongoTemplate.updateFirst(query, update, MailOutboxEntry.class);

        if (dead) {
            deadCounter.increment();
            log.error("Mail outbox entry {} is dead after {} attempts", entry.getId(), attempts, error);
        } else {
            retryCounter.increment();
            log.warn("Mail outbox entry {} failed on attempt {}; retry scheduled",
                    entry.getId(), attempts, error);
        }
    }

    static Duration retryDelay(int attempts) {
        return switch (attempts) {
            case 1 -> Duration.ofMinutes(1);
            case 2 -> Duration.ofMinutes(5);
            case 3 -> Duration.ofMinutes(30);
            case 4 -> Duration.ofHours(2);
            default -> Duration.ofHours(12);
        };
    }
}
