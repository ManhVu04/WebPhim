package com.example.bephim.repository;

import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MailOutboxRepository extends MongoRepository<MailOutboxEntry, String> {
    long countByStatus(MailOutboxStatus status);
    Page<MailOutboxEntry> findByStatus(MailOutboxStatus status, Pageable pageable);
}
