package com.example.bephim.repository;

import com.example.bephim.model.CommentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CommentReportRepository extends MongoRepository<CommentReport, String> {
    boolean existsByCommentIdAndReporterUserId(String commentId, String reporterUserId);

    Page<CommentReport> findByStatus(CommentReport.Status status, Pageable pageable);

    Page<CommentReport> findByCommentContentContainingIgnoreCaseOrReporterUsernameContainingIgnoreCaseOrReportedUsernameContainingIgnoreCase(
            String content, String reporter, String reported, Pageable pageable);

    Page<CommentReport> findByStatusAndCommentContentContainingIgnoreCaseOrStatusAndReporterUsernameContainingIgnoreCaseOrStatusAndReportedUsernameContainingIgnoreCase(
            CommentReport.Status status1, String content,
            CommentReport.Status status2, String reporter,
            CommentReport.Status status3, String reported,
            Pageable pageable);

    long countByStatus(CommentReport.Status status);
}
