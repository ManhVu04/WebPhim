package com.example.bephim.controller;

import com.example.bephim.dto.FavoriteRequest;
import com.example.bephim.model.Favorite;
import com.example.bephim.service.FavoriteService;
import jakarta.validation.Valid;
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

    @PostMapping({"", "/"})
    public ResponseEntity<?> add(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody FavoriteRequest body) {
        if (jwt == null) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }
        String userId = jwt.getClaimAsString("userId");
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "UNAUTHORIZED"));
        }

        Favorite fav = favoriteService.addFavorite(userId, body.movieSlug().trim(),
                body.movieName(), body.movieOriginName(), body.thumbUrl(), body.posterUrl(), body.year());
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
