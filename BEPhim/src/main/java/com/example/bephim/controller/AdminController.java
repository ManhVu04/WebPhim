package com.example.bephim.controller;

import com.example.bephim.model.Comment;
import com.example.bephim.service.MailMessagePayload;
import com.example.bephim.model.MailOutboxEntry;
import com.example.bephim.model.MailOutboxStatus;
import com.example.bephim.model.User;
import com.example.bephim.service.CommentService;
import com.example.bephim.service.EmailOutboxService;
import com.example.bephim.service.UserService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Validated
public class AdminController {

    private final UserService userService;
    private final CommentService commentService;
    private final EmailOutboxService emailOutboxService;
    private final MongoTemplate mongoTemplate;

    // --- 1. USER MANAGEMENT ---

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        Page<User> users = userService.listUsers(search, role, page, size);
        return ResponseEntity.ok(Map.of(
                "items", users.getContent().stream().map(AdminController::userResponse).toList(),
                "totalPages", users.getTotalPages(),
                "totalItems", users.getTotalElements(),
                "currentPage", users.getNumber()
        ));
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<?> updateUserRoles(
            @PathVariable String id,
            @RequestBody Map<String, List<String>> body) {
        List<String> roles = body.get("roles");
        try {
            User updated = userService.updateUserRoles(id, roles);
            return ResponseEntity.ok(userResponse(updated));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(400).body(Map.of("error", "BAD_REQUEST", "message", ex.getMessage()));
        }
    }

    @PostMapping("/users/{id}/revoke-sessions")
    public ResponseEntity<?> revokeUserSessions(@PathVariable String id) {
        userService.revokeAllTokens(id);
        return ResponseEntity.ok(Map.of("message", "User sessions revoked successfully"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id) {
        String adminUserId = requireUserId(jwt);
        try {
            userService.deleteUser(id, adminUserId);
            return ResponseEntity.ok(Map.of("deleted", true));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(400).body(Map.of("error", "BAD_REQUEST", "message", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(400).body(Map.of("error", "BAD_REQUEST", "message", ex.getMessage()));
        }
    }

    // --- 2. COMMENT MODERATION ---

    @GetMapping("/comments")
    public ResponseEntity<?> listComments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean hidden,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        Page<Comment> comments = commentService.listAdminComments(search, hidden, page, size);
        return ResponseEntity.ok(Map.of(
                "items", comments.getContent().stream().map(AdminController::commentAdminResponse).toList(),
                "totalPages", comments.getTotalPages(),
                "totalItems", comments.getTotalElements(),
                "currentPage", comments.getNumber()
        ));
    }

    @PostMapping("/comments/{id}/hide")
    public ResponseEntity<?> hideComment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id) {
        String adminUserId = requireUserId(jwt);
        if (!commentService.hideComment(id, adminUserId)) {
            return ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
        }
        return ResponseEntity.ok(Map.of("hidden", true));
    }

    @PostMapping("/comments/{id}/unhide")
    public ResponseEntity<?> unhideComment(@PathVariable String id) {
        if (!commentService.unhideComment(id)) {
            return ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
        }
        return ResponseEntity.ok(Map.of("hidden", false));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<?> deleteComment(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String id) {
        String adminUserId = requireUserId(jwt);
        return switch (commentService.deleteComment(id, adminUserId, true)) {
            case DELETED -> ResponseEntity.ok(Map.of("deleted", true));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
            case FORBIDDEN -> ResponseEntity.status(403).body(Map.of("error", "FORBIDDEN"));
        };
    }

    // --- 3. MAIL OUTBOX ERRORS ---

    @GetMapping("/mail-outbox")
    public ResponseEntity<?> listMailOutbox(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        MailOutboxStatus statusEnum = null;
        if (status != null && !status.isBlank()) {
            try {
                statusEnum = MailOutboxStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        Page<MailOutboxEntry> entries = emailOutboxService.listEntries(statusEnum, page, size);
        Map<String, Long> stats = emailOutboxService.getOutboxStats();

        List<Map<String, Object>> items = entries.getContent().stream()
                .map(entry -> outboxEntryResponse(entry, emailOutboxService))
                .toList();

        return ResponseEntity.ok(Map.of(
                "items", items,
                "totalPages", entries.getTotalPages(),
                "totalItems", entries.getTotalElements(),
                "currentPage", entries.getNumber(),
                "stats", stats
        ));
    }

    @PostMapping("/mail-outbox/{id}/retry")
    public ResponseEntity<?> retryMailOutbox(@PathVariable String id) {
        return switch (emailOutboxService.retryEntry(id)) {
            case RETRIED -> ResponseEntity.ok(Map.of("retried", true));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
            case NOT_RETRYABLE -> ResponseEntity.status(409).body(Map.of(
                    "error", "NOT_RETRYABLE",
                    "message", "Mail outbox entry is not retryable"));
        };
    }

    @PostMapping("/mail-outbox/retry-all-dead")
    public ResponseEntity<?> retryAllDeadMailOutbox() {
        int count = emailOutboxService.retryAllDead();
        return ResponseEntity.ok(Map.of("retriedCount", count));
    }

    @DeleteMapping("/mail-outbox/{id}")
    public ResponseEntity<?> deleteMailOutbox(@PathVariable String id) {
        if (!emailOutboxService.deleteEntry(id)) {
            return ResponseEntity.status(404).body(Map.of("error", "NOT_FOUND"));
        }
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    // --- 4. APP HEALTH MONITORING ---

    @GetMapping("/health")
    public ResponseEntity<?> getAppHealth() {
        // MongoDB ping status
        boolean dbOk = false;
        String dbName = "";
        try {
            dbName = mongoTemplate.getDb().getName();
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            dbOk = true;
        } catch (Exception ex) {
            dbOk = false;
        }

        // Outbox stats
        Map<String, Long> outboxStats = emailOutboxService.getOutboxStats();
        long deadMailCount = outboxStats.getOrDefault("dead", 0L);

        // Overall status
        String overallStatus = (!dbOk) ? "DOWN" : (deadMailCount > 0 ? "DEGRADED" : "UP");

        // Memory & System metrics
        Runtime runtime = Runtime.getRuntime();
        long totalMem = runtime.totalMemory();
        long freeMem = runtime.freeMemory();
        long maxMem = runtime.maxMemory();
        long usedMem = totalMem - freeMem;
        long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("jvmMemoryUsedMb", usedMem / (1024 * 1024));
        metrics.put("jvmMemoryTotalMb", totalMem / (1024 * 1024));
        metrics.put("jvmMemoryMaxMb", maxMem / (1024 * 1024));
        metrics.put("availableProcessors", runtime.availableProcessors());
        metrics.put("uptimeMs", uptimeMs);
        metrics.put("totalUsers", userService.countTotalUsers());
        metrics.put("adminUsers", userService.countAdminUsers());
        metrics.put("totalComments", commentService.countTotalComments());
        metrics.put("hiddenComments", commentService.countHiddenComments());

        Map<String, Object> response = new HashMap<>();
        response.put("status", overallStatus);
        response.put("database", Map.of("status", dbOk ? "UP" : "DOWN", "databaseName", dbName));
        response.put("outbox", outboxStats);
        response.put("metrics", metrics);

        return ResponseEntity.ok(response);
    }

    // --- HELPER METHODS ---

    private static Map<String, Object> userResponse(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("username", user.getUsername());
        map.put("email", user.getEmail() != null ? user.getEmail() : "");
        map.put("displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername());
        map.put("emailVerified", user.isEmailVerified());
        map.put("roles", user.getRoles() != null ? user.getRoles() : List.of("USER"));
        map.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : "");
        return map;
    }

    private static Map<String, Object> commentAdminResponse(Comment comment) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", comment.getId());
        map.put("movieSlug", comment.getMovieSlug());
        map.put("userId", comment.getUserId());
        map.put("username", comment.getUsername());
        map.put("displayName", comment.getDisplayName() != null ? comment.getDisplayName() : "");
        map.put("content", comment.getContent());
        map.put("hidden", comment.isHidden());
        map.put("hiddenAt", comment.getHiddenAt() != null ? comment.getHiddenAt().toString() : null);
        map.put("createdAt", comment.getCreatedAt() != null ? comment.getCreatedAt().toString() : "");
        return map;
    }

    private static Map<String, Object> outboxEntryResponse(MailOutboxEntry entry, EmailOutboxService service) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", entry.getId());
        map.put("status", entry.getStatus().name());
        map.put("attempts", entry.getAttempts());
        map.put("nextAttemptAt", entry.getNextAttemptAt() != null ? entry.getNextAttemptAt().toString() : null);
        map.put("createdAt", entry.getCreatedAt() != null ? entry.getCreatedAt().toString() : null);
        map.put("sentAt", entry.getSentAt() != null ? entry.getSentAt().toString() : null);
        map.put("lastError", entry.getLastError() != null ? entry.getLastError() : "");

        MailMessagePayload decrypted = service.decryptPayloadSafe(entry);
        if (decrypted != null) {
            map.put("recipient", decrypted.to());
            map.put("subject", decrypted.subject());
        } else {
            map.put("recipient", "Unknown (Encrypted)");
            map.put("subject", "Encrypted Message");
        }
        return map;
    }

    private static String requireUserId(Jwt jwt) {
        String userId = jwt == null ? null : jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Invalid token");
        }
        return userId;
    }
}
