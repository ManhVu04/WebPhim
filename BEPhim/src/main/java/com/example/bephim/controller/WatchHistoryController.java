package com.example.bephim.controller;

import com.example.bephim.dto.WatchHistoryRequest;
import com.example.bephim.model.WatchHistory;
import com.example.bephim.service.WatchHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class WatchHistoryController {

    private final WatchHistoryService watchHistoryService;

    @GetMapping({"", "/"})
    public ResponseEntity<?> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
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
                serverIndex, episodeIndex, body.movieName(), body.movieOriginName(), body.thumbUrl(), body.posterUrl(), body.year(), body.episodeName());
        return ResponseEntity.ok(Map.of("recorded", true));
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
