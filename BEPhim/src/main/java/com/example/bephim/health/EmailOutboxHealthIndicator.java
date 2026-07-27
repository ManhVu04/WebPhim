package com.example.bephim.health;

import com.example.bephim.model.MailOutboxStatus;
import com.example.bephim.repository.MailOutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.health.contributor.Health;
import org.springframework.boot.health.contributor.HealthIndicator;
import org.springframework.stereotype.Component;

@Component("mailOutbox")
@RequiredArgsConstructor
public class EmailOutboxHealthIndicator implements HealthIndicator {

    private final MailOutboxRepository repository;

    @Override
    public Health health() {
        long pending = repository.countByStatus(MailOutboxStatus.PENDING);
        long sending = repository.countByStatus(MailOutboxStatus.SENDING);
        long dead = repository.countByStatus(MailOutboxStatus.DEAD);

        Health.Builder builder = dead > 0
                ? Health.status("DEGRADED")
                : Health.up();
        return builder
                .withDetail("pending", pending)
                .withDetail("sending", sending)
                .withDetail("dead", dead)
                .build();
    }
}
