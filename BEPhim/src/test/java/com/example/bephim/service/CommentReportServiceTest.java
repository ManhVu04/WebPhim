package com.example.bephim.service;

import com.example.bephim.model.Comment;
import com.example.bephim.model.CommentReport;
import com.example.bephim.repository.CommentRepository;
import com.example.bephim.repository.CommentReportRepository;
import com.mongodb.client.result.UpdateResult;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class CommentReportServiceTest {

    private final CommentReportRepository reportRepository = mock(CommentReportRepository.class);
    private final CommentRepository commentRepository = mock(CommentRepository.class);
    private final CommentService commentService = mock(CommentService.class);
    private final MongoTemplate mongoTemplate = mock(MongoTemplate.class);
    private final CommentReportService service =
            new CommentReportService(reportRepository, commentRepository, commentService, mongoTemplate);

    @Test
    void submitReport_success() {
        Comment comment = comment("c1", "u1", "user1", "movie-1", "Bad text");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterUserId("c1", "u2")).thenReturn(false);

        CommentReportService.SubmitReportResult result = service.submitReport("c1", "u2", "user2", "SPAM", "Spamming link");

        assertThat(result).isEqualTo(CommentReportService.SubmitReportResult.SUCCESS);
        verify(reportRepository).save(any(CommentReport.class));
    }

    @Test
    void submitReport_cannotReportOwnComment() {
        Comment comment = comment("c1", "u1", "user1", "movie-1", "Bad text");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));

        CommentReportService.SubmitReportResult result = service.submitReport("c1", "u1", "user1", "SPAM", "");

        assertThat(result).isEqualTo(CommentReportService.SubmitReportResult.CANNOT_REPORT_OWN_COMMENT);
        verify(reportRepository, never()).save(any());
    }

    @Test
    void submitReport_alreadyReported() {
        Comment comment = comment("c1", "u1", "user1", "movie-1", "Bad text");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterUserId("c1", "u2")).thenReturn(true);

        CommentReportService.SubmitReportResult result = service.submitReport("c1", "u2", "user2", "SPAM", "");

        assertThat(result).isEqualTo(CommentReportService.SubmitReportResult.ALREADY_REPORTED);
        verify(reportRepository, never()).save(any());
    }

    @Test
    void submitReport_duplicateKeyFromConcurrentRequestIsAlreadyReported() {
        Comment comment = comment("c1", "u1", "user1", "movie-1", "Bad text");
        when(commentRepository.findById("c1")).thenReturn(Optional.of(comment));
        when(reportRepository.existsByCommentIdAndReporterUserId("c1", "u2")).thenReturn(false);
        when(reportRepository.save(any(CommentReport.class)))
                .thenThrow(new DuplicateKeyException("duplicate report"));

        CommentReportService.SubmitReportResult result =
                service.submitReport("c1", "u2", "user2", "SPAM", "");

        assertThat(result).isEqualTo(CommentReportService.SubmitReportResult.ALREADY_REPORTED);
    }

    @Test
    void submitReport_notFound() {
        when(commentRepository.findById("c1")).thenReturn(Optional.empty());

        CommentReportService.SubmitReportResult result = service.submitReport("c1", "u2", "user2", "SPAM", "");

        assertThat(result).isEqualTo(CommentReportService.SubmitReportResult.NOT_FOUND);
    }

    @Test
    void resolveReport_hide() {
        CommentReport report = report("r1", "c1");
        claim(report);
        finishSucceeds();
        when(commentService.hideComment("c1", "admin1")).thenReturn(true);

        CommentReportService.ResolveResult result = service.resolveReport("r1", "HIDE", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.SUCCESS);
        verify(commentService).hideComment("c1", "admin1");
        assertClaimedOnlyFromPending("r1");
        assertFinalStatus(CommentReport.Status.RESOLVED_HIDDEN);
    }

    @Test
    void resolveReport_delete() {
        CommentReport report = report("r1", "c1");
        claim(report);
        finishSucceeds();
        when(commentService.deleteComment("c1", "admin1", true))
                .thenReturn(CommentService.DeleteResult.DELETED);

        CommentReportService.ResolveResult result = service.resolveReport("r1", "DELETE", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.SUCCESS);
        verify(commentService).deleteComment("c1", "admin1", true);
        assertFinalStatus(CommentReport.Status.RESOLVED_DELETED);
    }

    @Test
    void resolveReport_dismiss() {
        CommentReport report = report("r1", "c1");
        claim(report);
        finishSucceeds();

        CommentReportService.ResolveResult result = service.resolveReport("r1", "DISMISS", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.SUCCESS);
        verifyNoInteractions(commentService);
        assertFinalStatus(CommentReport.Status.DISMISSED);
    }

    @Test
    void resolveReport_rejectsSecondAdminAfterReportWasClaimed() {
        when(mongoTemplate.findAndModify(
                any(Query.class),
                any(Update.class),
                any(FindAndModifyOptions.class),
                eq(CommentReport.class))).thenReturn(null);
        when(reportRepository.existsById("r1")).thenReturn(true);

        CommentReportService.ResolveResult result = service.resolveReport("r1", "DELETE", "admin2");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.ALREADY_RESOLVED);
        verifyNoInteractions(commentService);
        verify(mongoTemplate, never()).updateFirst(any(Query.class), any(Update.class), eq(CommentReport.class));
    }

    @Test
    void resolveReport_hideRecordsMissingCommentInsteadOfHidden() {
        claim(report("r1", "c1"));
        finishSucceeds();
        when(commentService.hideComment("c1", "admin1")).thenReturn(false);

        CommentReportService.ResolveResult result = service.resolveReport("r1", "HIDE", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.COMMENT_NOT_FOUND);
        assertFinalStatus(CommentReport.Status.COMMENT_NOT_FOUND);
    }

    @Test
    void resolveReport_deleteRecordsMissingCommentInsteadOfDeleted() {
        claim(report("r1", "c1"));
        finishSucceeds();
        when(commentService.deleteComment("c1", "admin1", true))
                .thenReturn(CommentService.DeleteResult.NOT_FOUND);

        CommentReportService.ResolveResult result = service.resolveReport("r1", "DELETE", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.COMMENT_NOT_FOUND);
        assertFinalStatus(CommentReport.Status.COMMENT_NOT_FOUND);
    }

    @Test
    void resolveReport_recordsUnexpectedModerationFailure() {
        claim(report("r1", "c1"));
        finishSucceeds();
        when(commentService.hideComment("c1", "admin1"))
                .thenThrow(new IllegalStateException("database unavailable"));

        CommentReportService.ResolveResult result = service.resolveReport("r1", "HIDE", "admin1");

        assertThat(result).isEqualTo(CommentReportService.ResolveResult.ACTION_FAILED);
        assertFinalStatus(CommentReport.Status.RESOLUTION_FAILED);
    }

    @Test
    void resolveReport_returnsNotFoundWhenReportDoesNotExist() {
        when(mongoTemplate.findAndModify(
                any(Query.class),
                any(Update.class),
                any(FindAndModifyOptions.class),
                eq(CommentReport.class))).thenReturn(null);
        when(reportRepository.existsById("missing")).thenReturn(false);

        assertThat(service.resolveReport("missing", "DISMISS", "admin1"))
                .isEqualTo(CommentReportService.ResolveResult.NOT_FOUND);
    }

    @Test
    void resolveReport_rejectsInvalidActionBeforeClaiming() {
        assertThat(service.resolveReport("r1", "INVALID", "admin1"))
                .isEqualTo(CommentReportService.ResolveResult.INVALID_ACTION);

        verifyNoInteractions(mongoTemplate, commentService);
    }

    private static Comment comment(String id, String userId, String username, String movieSlug, String content) {
        Comment c = new Comment();
        c.setId(id);
        c.setUserId(userId);
        c.setUsername(username);
        c.setMovieSlug(movieSlug);
        c.setContent(content);
        return c;
    }

    private static CommentReport report(String id, String commentId) {
        CommentReport r = new CommentReport();
        r.setId(id);
        r.setCommentId(commentId);
        r.setStatus(CommentReport.Status.PROCESSING);
        return r;
    }

    private void claim(CommentReport report) {
        when(mongoTemplate.findAndModify(
                any(Query.class),
                any(Update.class),
                any(FindAndModifyOptions.class),
                eq(CommentReport.class))).thenReturn(report);
    }

    private void finishSucceeds() {
        when(mongoTemplate.updateFirst(any(Query.class), any(Update.class), eq(CommentReport.class)))
                .thenReturn(UpdateResult.acknowledged(1, 1L, null));
    }

    private void assertClaimedOnlyFromPending(String reportId) {
        var queryCaptor = org.mockito.ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).findAndModify(
                queryCaptor.capture(),
                any(Update.class),
                any(FindAndModifyOptions.class),
                eq(CommentReport.class));
        Document query = queryCaptor.getValue().getQueryObject();
        assertThat(query.get("_id")).isEqualTo(reportId);
        assertThat(query.get("status")).isEqualTo(CommentReport.Status.PENDING);
    }

    private void assertFinalStatus(CommentReport.Status expected) {
        var updateCaptor = org.mockito.ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), updateCaptor.capture(), eq(CommentReport.class));
        assertThat(updateCaptor.getValue().getUpdateObject().get("$set", Document.class).get("status"))
                .isEqualTo(expected);
    }
}
