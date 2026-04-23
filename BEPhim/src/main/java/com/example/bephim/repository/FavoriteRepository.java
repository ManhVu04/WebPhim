package com.example.bephim.repository;

import com.example.bephim.model.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FavoriteRepository extends MongoRepository<Favorite, String> {
    Page<Favorite> findByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);
    boolean existsByUserIdAndMovieSlug(String userId, String movieSlug);
    Favorite findByUserIdAndMovieSlug(String userId, String movieSlug);
    void deleteByUserIdAndMovieSlug(String userId, String movieSlug);
}
