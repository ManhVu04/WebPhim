package com.example.bephim.service;

import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import com.example.bephim.repository.MailOutboxRepository;
import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class EmailOutboxServiceTest {

    private final MailOutboxRepository repository = mock(MailOutboxRepository.class);
    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final OutboxCryptoService cryptoService = mock(OutboxCryptoService.class);
    private final EmailService emailService = mock(EmailService.class);
    private final EmailOutboxService service = new EmailOutboxService(
            repository,
            mongoTemplate,
            cryptoService,
            emailService);

    @Test
    void retriesOnlyDeadEntriesWithPayload() {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(MailOutboxEntry.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));

        assertThat(service.retryEntry("mail-id")).isEqualTo(EmailOutboxService.RetryResult.RETRIED);
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).updateFirst(queryCaptor.capture(), any(Update.class), eq(MailOutboxEntry.class));
        Document query = queryCaptor.getValue().getQueryObject();
        assertThat(query.get("_id")).isEqualTo("mail-id");
        assertThat(query.get("status")).isEqualTo(MailOutboxStatus.DEAD);
        assertThat((Document) query.get("encryptedPayload")).containsEntry("$ne", null);
        verify(repository, never()).save(any());
    }

    @Test
    void rejectsSentSendingPendingAndPayloadlessRetries() {
        assertNotRetryable(MailOutboxStatus.SENT, null);
        assertNotRetryable(MailOutboxStatus.SENDING, "payload");
        assertNotRetryable(MailOutboxStatus.PENDING, "payload");
        assertNotRetryable(MailOutboxStatus.DEAD, null);
    }

    @Test
    void returnsNotFoundWhenRetryTargetMissing() {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(MailOutboxEntry.class)))
                .thenReturn(UpdateResult.acknowledged(0, 0L, null));
        when(repository.existsById("missing")).thenReturn(false);

        assertThat(service.retryEntry("missing")).isEqualTo(EmailOutboxService.RetryResult.NOT_FOUND);
    }

    @Test
    void retriesAllDeadWithBulkUpdate() {
        when(mongoTemplate.updateMulti(any(Query.class), any(Update.class), eq(MailOutboxEntry.class)))
                .thenReturn(UpdateResult.acknowledged(7, 7L, null));

        assertThat(service.retryAllDead()).isEqualTo(7);

        verify(mongoTemplate).updateMulti(any(Query.class), any(Update.class), eq(MailOutboxEntry.class));
        verifyNoInteractions(repository);
    }

    @Test
    void bulkRetryFiltersToDeadEntriesWithPayload() {
        when(mongoTemplate.updateMulti(any(Query.class), any(Update.class), eq(MailOutboxEntry.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));

        service.retryAllDead();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).updateMulti(queryCaptor.capture(), any(Update.class), eq(MailOutboxEntry.class));
        Document query = queryCaptor.getValue().getQueryObject();
        assertThat(query.get("status")).isEqualTo(MailOutboxStatus.DEAD);
        assertThat((Document) query.get("encryptedPayload")).containsEntry("$ne", null);
    }

    private void assertNotRetryable(MailOutboxStatus status, String payload) {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(MailOutboxEntry.class)))
                .thenReturn(UpdateResult.acknowledged(0, 0L, null));
        when(repository.existsById(status.name() + payload)).thenReturn(true);

        assertThat(service.retryEntry(status.name() + payload))
                .isEqualTo(EmailOutboxService.RetryResult.NOT_RETRYABLE);
        verify(repository, never()).save(any());
    }
}
