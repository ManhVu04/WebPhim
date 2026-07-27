package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("mail_outbox")
public class MailOutboxEntry {

    @Id
    private String id;

    private String encryptedPayload;
    private MailOutboxStatus status;
    private int attempts;
    private Instant nextAttemptAt;
    private Instant lockedUntil;
    private Instant createdAt;
    private Instant sentAt;
    private String lastError;
}
