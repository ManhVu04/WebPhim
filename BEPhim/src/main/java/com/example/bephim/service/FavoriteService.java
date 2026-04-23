package com.example.bephim.service;

import com.example.bephim.model.Favorite;
import com.example.bephim.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;

    public Page<Favorite> listFavorites(String userId, int page, int size) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size));
    }

    public Favorite addFavorite(String userId, String movieSlug,
                                String movieName, String movieOriginName,
                                String thumbUrl, String posterUrl, Integer year) {
        if (favoriteRepository.existsByUserIdAndMovieSlug(userId, movieSlug)) {
            // Return existing instead of throwing
            return favoriteRepository.findByUserIdAndMovieSlug(userId, movieSlug);
        }
        Favorite fav = new Favorite();
        fav.setUserId(userId);
        fav.setMovieSlug(movieSlug);
        fav.setCreatedAt(Instant.now());
        fav.setMovieName(movieName);
        fav.setMovieOriginName(movieOriginName);
        fav.setThumbUrl(thumbUrl);
        fav.setPosterUrl(posterUrl);
        fav.setYear(year);
        return favoriteRepository.save(fav);
    }

    public void removeFavorite(String userId, String movieSlug) {
        favoriteRepository.deleteByUserIdAndMovieSlug(userId, movieSlug);
    }

    public boolean isFavorited(String userId, String movieSlug) {
        return favoriteRepository.existsByUserIdAndMovieSlug(userId, movieSlug);
    }
}
