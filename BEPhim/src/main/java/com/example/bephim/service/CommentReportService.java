package com.example.bephim.service;

import com.example.bephim.model.Comment;
import com.example.bephim.model.CommentReport;
import com.example.bephim.repository.CommentRepository;
import com.example.bephim.repository.CommentReportRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CommentReportService {

    private static final Logger log = LoggerFactory.getLogger(CommentReportService.class);

    private final CommentReportRepository commentReportRepository;
    private final CommentRepository commentRepository;
    private final CommentService commentService;
    private final MongoTemplate mongoTemplate;

    public SubmitReportResult submitReport(
            String commentId,
            String reporterUserId,
            String reporterUsername,
            String reason,
            String details) {
        Comment comment = commentRepository.findById(commentId).orElse(null);
        if (comment == null) {
            return SubmitReportResult.NOT_FOUND;
        }

        if (reporterUserId.equals(comment.getUserId())) {
            return SubmitReportResult.CANNOT_REPORT_OWN_COMMENT;
        }

        if (commentReportRepository.existsByCommentIdAndReporterUserId(commentId, reporterUserId)) {
            return SubmitReportResult.ALREADY_REPORTED;
        }

        CommentReport report = new CommentReport();
        report.setCommentId(comment.getId());
        report.setCommentContent(comment.getContent());
        report.setMovieSlug(comment.getMovieSlug());
        report.setReportedUserId(comment.getUserId());
        report.setReportedUsername(comment.getUsername());
        report.setReporterUserId(reporterUserId);
        report.setReporterUsername(reporterUsername);
        report.setReason(reason.trim());
        report.setDetails(details != null ? details.trim() : "");
        report.setStatus(CommentReport.Status.PENDING);
        report.setCreatedAt(Instant.now());

        try {
            commentReportRepository.save(report);
            return SubmitReportResult.SUCCESS;
        } catch (DuplicateKeyException ex) {
            return SubmitReportResult.ALREADY_REPORTED;
        }
    }

    public Page<CommentReport> listReports(String search, CommentReport.Status statusFilter, int page, int size) {
        // ponytail: 4-branch search/filter dispatch duplicates CommentService.listAdminComments.
        // Extract to shared predicate builder when a 3rd admin list endpoint needs it.
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean hasSearch = search != null && !search.isBlank();

        if (hasSearch && statusFilter != null) {
            String trimmed = search.trim();
            return commentReportRepository.findByStatusAndCommentContentContainingIgnoreCaseOrStatusAndReporterUsernameContainingIgnoreCaseOrStatusAndReportedUsernameContainingIgnoreCase(
                    statusFilter, trimmed, statusFilter, trimmed, statusFilter, trimmed, pageable);
        } else if (hasSearch) {
            String trimmed = search.trim();
            return commentReportRepository.findByCommentContentContainingIgnoreCaseOrReporterUsernameContainingIgnoreCaseOrReportedUsernameContainingIgnoreCase(
                    trimmed, trimmed, trimmed, pageable);
        } else if (statusFilter != null) {
            return commentReportRepository.findByStatus(statusFilter, pageable);
        } else {
            return commentReportRepository.findAll(pageable);
        }
    }

    public ResolveResult resolveReport(String reportId, String action, String adminUserId) {
        CommentReport.Status resolvedStatus;
        if ("HIDE".equalsIgnoreCase(action)) {
            resolvedStatus = CommentReport.Status.RESOLVED_HIDDEN;
        } else if ("DELETE".equalsIgnoreCase(action)) {
            resolvedStatus = CommentReport.Status.RESOLVED_DELETED;
        } else if ("DISMISS".equalsIgnoreCase(action)) {
            resolvedStatus = CommentReport.Status.DISMISSED;
        } else {
            return ResolveResult.INVALID_ACTION;
        }

        CommentReport report = claimPendingReport(reportId, adminUserId);
        if (report == null) {
            return commentReportRepository.existsById(reportId)
                    ? ResolveResult.ALREADY_RESOLVED
                    : ResolveResult.NOT_FOUND;
        }

        try {
            if (resolvedStatus == CommentReport.Status.RESOLVED_HIDDEN
                    && !commentService.hideComment(report.getCommentId(), adminUserId)) {
                return finishResolution(reportId, adminUserId, CommentReport.Status.COMMENT_NOT_FOUND)
                        ? ResolveResult.COMMENT_NOT_FOUND
                        : ResolveResult.ACTION_FAILED;
            }

            if (resolvedStatus == CommentReport.Status.RESOLVED_DELETED) {
                CommentService.DeleteResult deleteResult =
                        commentService.deleteComment(report.getCommentId(), adminUserId, true);
                if (deleteResult == CommentService.DeleteResult.NOT_FOUND) {
                    return finishResolution(reportId, adminUserId, CommentReport.Status.COMMENT_NOT_FOUND)
                            ? ResolveResult.COMMENT_NOT_FOUND
                            : ResolveResult.ACTION_FAILED;
                }
                if (deleteResult != CommentService.DeleteResult.DELETED) {
                    finishResolution(reportId, adminUserId, CommentReport.Status.RESOLUTION_FAILED);
                    return ResolveResult.ACTION_FAILED;
                }
            }
        } catch (RuntimeException ex) {
            finishResolution(reportId, adminUserId, CommentReport.Status.RESOLUTION_FAILED);
            log.error("Failed to resolve comment report {}", reportId, ex);
            return ResolveResult.ACTION_FAILED;
        }

        return finishResolution(reportId, adminUserId, resolvedStatus)
                ? ResolveResult.SUCCESS
                : ResolveResult.ACTION_FAILED;
    }

    private CommentReport claimPendingReport(String reportId, String adminUserId) {
        Query query = Query.query(Criteria.where("_id").is(reportId)
                .and("status").is(CommentReport.Status.PENDING));
        Update update = new Update()
                .set("status", CommentReport.Status.PROCESSING)
                .set("resolvedByUserId", adminUserId);
        return mongoTemplate.findAndModify(
                query,
                update,
                FindAndModifyOptions.options().returnNew(true),
                CommentReport.class);
    }

    private boolean finishResolution(
            String reportId,
            String adminUserId,
            CommentReport.Status finalStatus) {
        Query query = Query.query(Criteria.where("_id").is(reportId)
                .and("status").is(CommentReport.Status.PROCESSING)
                .and("resolvedByUserId").is(adminUserId));
        Update update = new Update()
                .set("status", finalStatus)
                .set("resolvedAt", Instant.now());
        return mongoTemplate.updateFirst(query, update, CommentReport.class).getModifiedCount() == 1;
    }

    public long countPendingReports() {
        return commentReportRepository.countByStatus(CommentReport.Status.PENDING);
    }

    public enum SubmitReportResult {
        SUCCESS,
        NOT_FOUND,
        CANNOT_REPORT_OWN_COMMENT,
        ALREADY_REPORTED
    }

    public enum ResolveResult {
        SUCCESS,
        NOT_FOUND,
        INVALID_ACTION,
        ALREADY_RESOLVED,
        COMMENT_NOT_FOUND,
        ACTION_FAILED
    }
}
