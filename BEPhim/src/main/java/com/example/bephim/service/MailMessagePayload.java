package com.example.bephim.service;

import java.util.Objects;

public record MailMessagePayload(String to, String subject, String text) {

    public MailMessagePayload {
        Objects.requireNonNull(to, "to");
        Objects.requireNonNull(subject, "subject");
        Objects.requireNonNull(text, "text");
    }
}
