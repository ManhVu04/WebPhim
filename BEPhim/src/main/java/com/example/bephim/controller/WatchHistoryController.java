package com.example.bephim.controller;

import com.example.bephim.dto.WatchHistoryRequest;
import com.example.bephim.model.WatchHistory;
import com.example.bephim.service.WatchHistoryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
@Validated
public class WatchHistoryController {

    private final WatchHistoryService watchHistoryService;

    @GetMapping({"", "/"})
    public ResponseEntity<?> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "24") @Min(1) @Max(100) int size) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        Page<WatchHistory> history = watchHistoryService.listHistory(userId, page, size);
        return ResponseEntity.ok(Map.of(
                "items", history.getContent(),
                "totalPages", history.getTotalPages(),
                "totalItems", history.getTotalElements(),
                "currentPage", history.getNumber()
        ));
    }

    @PostMapping({"", "/"})
    public ResponseEntity<?> record(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody WatchHistoryRequest body) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String episodeSlug = body.episodeSlug() != null ? body.episodeSlug().trim() : "";
        int serverIndex = body.serverIndex() != null ? body.serverIndex() : 0;
        int episodeIndex = body.episodeIndex() != null ? body.episodeIndex() : 0;

        watchHistoryService.recordWatch(userId, body.movieSlug().trim(),
                episodeSlug,
                serverIndex, episodeIndex, body.movieName(), body.movieOriginName(), body.thumbUrl(), body.posterUrl(), body.year(), body.episodeName(),
                body.progressSeconds(), body.durationSeconds());
        return ResponseEntity.ok(Map.of("recorded", true));
    }

    @GetMapping("/progress")
    public ResponseEntity<?> getProgress(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam @NotBlank String movieSlug,
            @RequestParam(defaultValue = "") String episodeSlug) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        Optional<WatchHistory> entry =
                watchHistoryService.getProgress(userId, movieSlug.trim(), episodeSlug.trim());
        if (entry.isEmpty() || entry.get().getProgressSeconds() == null) {
            return ResponseEntity.ok(Map.of("progressSeconds", 0, "durationSeconds", 0));
        }
        var h = entry.get();
        return ResponseEntity.ok(Map.of(
                "progressSeconds", h.getProgressSeconds(),
                "durationSeconds", h.getDurationSeconds() != null ? h.getDurationSeconds() : 0
        ));
    }

    @DeleteMapping
    public ResponseEntity<?> clear(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        watchHistoryService.clearHistory(userId);
        return ResponseEntity.ok(Map.of("cleared", true));
    }
}
