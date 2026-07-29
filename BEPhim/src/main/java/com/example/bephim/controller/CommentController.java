package com.example.bephim.controller;

import com.example.bephim.dto.CommentReportRequest;
import com.example.bephim.dto.CommentRequest;
import com.example.bephim.model.Comment;
import com.example.bephim.service.CommentReportService;
import com.example.bephim.service.CommentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@Validated
public class CommentController {

    private final CommentService commentService;
    private final CommentReportService commentReportService;

    @GetMapping({"", "/"})
    public ResponseEntity<?> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam @NotBlank @Size(max = 200) String movieSlug,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        Page<Comment> comments = commentService.listVisible(movieSlug, page, size);
        return ResponseEntity.ok(Map.of(
                "items", comments.getContent().stream()
                        .map(comment -> commentResponse(comment, jwt))
                        .toList(),
                "totalPages", comments.getTotalPages(),
                "totalItems", comments.getTotalElements(),
                "currentPage", comments.getNumber()
        ));
    }

    @PostMapping({"", "/"})
    public ResponseEntity<?> add(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CommentRequest body) {
        String userId = requireUserId(jwt);
        Comment comment = commentService.addComment(
                userId,
                jwt.getSubject(),
                jwt.getClaimAsString("displayName"),
                body.movieSlug(),
                body.content());
        return ResponseEntity.ok(commentResponse(comment, jwt));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id) {
        String userId = requireUserId(jwt);
        return switch (commentService.deleteComment(id, userId, isAdmin(jwt))) {
            case DELETED -> ResponseEntity.ok(Map.of("deleted", true));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
            case FORBIDDEN -> ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN"));
        };
    }

    @PostMapping("/{id}/hide")
    public ResponseEntity<?> hide(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id) {
        String userId = requireUserId(jwt);
        if (!isAdmin(jwt)) {
            return ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN"));
        }
        if (!commentService.hideComment(id, userId)) {
            return ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
        }
        return ResponseEntity.ok(Map.of("hidden", true));
    }

    @PostMapping("/{id}/report")
    public ResponseEntity<?> report(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id,
            @Valid @RequestBody CommentReportRequest body) {
        String userId = requireUserId(jwt);
        String username = jwt.getSubject();
        return switch (commentReportService.submitReport(
                id,
                userId,
                username,
                body.reason(),
                body.details())) {
            case SUCCESS -> ResponseEntity.ok(Map.of("reported", true));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND", "message", "Bình luận không tồn tại"));
            case CANNOT_REPORT_OWN_COMMENT -> ResponseEntity.status(400).body(Map.of("error", "BAD_REQUEST", "message", "Bạn không thể báo cáo bình luận của chính mình"));
            case ALREADY_REPORTED -> ResponseEntity.status(400).body(Map.of("error", "ALREADY_REPORTED", "message", "Bạn đã báo cáo bình luận này rồi"));
        };
    }

    private static Map<String, Object> commentResponse(Comment comment, Jwt jwt) {
        Map<String, Object> body = new HashMap<>();
        body.put("id", comment.getId());
        body.put("movieSlug", comment.getMovieSlug());
        body.put("username", comment.getUsername());
        body.put("displayName", valueOrEmpty(comment.getDisplayName()));
        body.put("content", comment.getContent());
        body.put("createdAt", comment.getCreatedAt().toString());
        body.put("ownedByCurrentUser", isOwner(comment, jwt));
        return body;
    }

    private static boolean isOwner(Comment comment, Jwt jwt) {
        String userId = jwt == null ? null : jwt.getClaimAsString("userId");
        return userId != null && userId.equals(comment.getUserId());
    }

    private static boolean isAdmin(Jwt jwt) {
        if (jwt == null) return false;
        Object roles = jwt.getClaim("roles");
        if (roles instanceof List<?> list) {
            return list.stream().anyMatch(role -> "ADMIN".equals(String.valueOf(role)));
        }
        return "ADMIN".equals(String.valueOf(roles));
    }

    private static String requireUserId(Jwt jwt) {
        String userId = jwt == null ? null : jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Invalid token");
        }
        return userId;
    }

    private static String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }
}
