package com.example.bephim.controller;

import com.example.bephim.model.Favorite;
import com.example.bephim.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

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
        Page<Favorite> favorites = favoriteService.listFavorites(userId, page, size);
        return ResponseEntity.ok(Map.of(
                "items", favorites.getContent(),
                "totalPages", favorites.getTotalPages(),
                "totalItems", favorites.getTotalElements(),
                "currentPage", favorites.getNumber()
        ));
    }

    @PostMapping
    public ResponseEntity<?> add(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody Map<String, Object> body) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String movieSlug = (String) body.get("movieSlug");
        if (movieSlug == null || movieSlug.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "movieSlug is required"));
        }
        String movieName = (String) body.get("movieName");
        String movieOriginName = (String) body.get("movieOriginName");
        String thumbUrl = (String) body.get("thumbUrl");
        String posterUrl = (String) body.get("posterUrl");
        Integer year = body.get("year") instanceof Number n ? n.intValue() : null;

        Favorite fav = favoriteService.addFavorite(userId, movieSlug.trim(),
                movieName, movieOriginName, thumbUrl, posterUrl, year);
        return ResponseEntity.ok(Map.of("movieSlug", fav.getMovieSlug(), "createdAt", fav.getCreatedAt().toString()));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<?> remove(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        favoriteService.removeFavorite(userId, slug);
        return ResponseEntity.ok(Map.of("removed", true));
    }

    @GetMapping("/{slug}/check")
    public ResponseEntity<?> check(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        boolean favorited = favoriteService.isFavorited(userId, slug);
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }
}
