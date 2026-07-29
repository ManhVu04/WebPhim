package com.example.bephim.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Document("comment_reports")
public class CommentReport {
    @Id
    private String id;

    private String commentId;
    private String commentContent;
    private String movieSlug;

    private String reportedUserId;
    private String reportedUsername;

    private String reporterUserId;
    private String reporterUsername;

    private String reason;
    private String details;

    private Status status = Status.PENDING;

    private Instant createdAt;
    private Instant resolvedAt;
    private String resolvedByUserId;

    public enum Status {
        PENDING,
        PROCESSING,
        RESOLVED_HIDDEN,
        RESOLVED_DELETED,
        DISMISSED,
        COMMENT_NOT_FOUND,
        RESOLUTION_FAILED
    }
}
