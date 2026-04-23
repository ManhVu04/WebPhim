package com.example.bephim.repository;

import com.example.bephim.model.WatchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WatchHistoryRepository extends MongoRepository<WatchHistory, String> {
    Page<WatchHistory> findByUserIdOrderByWatchedAtDesc(String userId, Pageable pageable);
    void deleteByUserId(String userId);
}
