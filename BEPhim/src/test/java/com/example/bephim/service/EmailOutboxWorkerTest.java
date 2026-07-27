package com.example.bephim.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class EmailOutboxWorkerTest {

    @Test
    void retryScheduleBacksOffAndCapsAtTwelveHours() {
        assertThat(EmailOutboxWorker.retryDelay(1)).isEqualTo(Duration.ofMinutes(1));
        assertThat(EmailOutboxWorker.retryDelay(2)).isEqualTo(Duration.ofMinutes(5));
        assertThat(EmailOutboxWorker.retryDelay(3)).isEqualTo(Duration.ofMinutes(30));
        assertThat(EmailOutboxWorker.retryDelay(4)).isEqualTo(Duration.ofHours(2));
        assertThat(EmailOutboxWorker.retryDelay(5)).isEqualTo(Duration.ofHours(12));
        assertThat(EmailOutboxWorker.retryDelay(99)).isEqualTo(Duration.ofHours(12));
    }
}
