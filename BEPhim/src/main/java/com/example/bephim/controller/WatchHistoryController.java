package com.example.bephim.controller;

import com.example.bephim.model.WatchHistory;
import com.example.bephim.service.WatchHistoryService;
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

    @GetMapping
    public ResponseEntity<?> list(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        String userId = jwt.getClaimAsString("userId");
        Page<WatchHistory> history = watchHistoryService.listHistory(userId, page, size);
        return ResponseEntity.ok(Map.of(
                "items", history.getContent(),
                "totalPages", history.getTotalPages(),
                "totalItems", history.getTotalElements(),
                "currentPage", history.getNumber()
        ));
    }

    @PostMapping
    public ResponseEntity<?> record(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body) {
        String userId = jwt.getClaimAsString("userId");
        String movieSlug = (String) body.get("movieSlug");
        String episodeSlug = (String) body.getOrDefault("episodeSlug", "");
        int serverIndex = body.get("serverIndex") instanceof Number n ? n.intValue() : 0;
        int episodeIndex = body.get("episodeIndex") instanceof Number n ? n.intValue() : 0;
        String movieName = (String) body.get("movieName");
        String movieOriginName = (String) body.get("movieOriginName");
        String thumbUrl = (String) body.get("thumbUrl");
        String posterUrl = (String) body.get("posterUrl");
        Integer year = body.get("year") instanceof Number n ? n.intValue() : null;
        String episodeName = (String) body.get("episodeName");

        if (movieSlug == null || movieSlug.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "movieSlug is required"));
        }

        watchHistoryService.recordWatch(userId, movieSlug.trim(),
                episodeSlug != null ? episodeSlug.trim() : "",
                serverIndex, episodeIndex, movieName, movieOriginName, thumbUrl, posterUrl, year, episodeName);
        return ResponseEntity.ok(Map.of("recorded", true));
    }

    @DeleteMapping
    public ResponseEntity<?> clear(@AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getClaimAsString("userId");
        watchHistoryService.clearHistory(userId);
        return ResponseEntity.ok(Map.of("cleared", true));
    }
}
