package com.example.bephim.service;

import com.example.bephim.model.WatchHistory;
import com.example.bephim.repository.WatchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class WatchHistoryService {

    private final WatchHistoryRepository watchHistoryRepository;
    private final MongoTemplate mongoTemplate;

    public Page<WatchHistory> listHistory(String userId, int page, int size) {
        return watchHistoryRepository.findByUserIdOrderByWatchedAtDesc(userId, PageRequest.of(page, size));
    }

    /**
     * Upsert: nếu đã xem episode này thì cập nhật watchedAt, không tạo bản ghi mới.
     */
    public void recordWatch(String userId, String movieSlug, String episodeSlug,
                            int serverIndex, int episodeIndex,
                            String movieName, String movieOriginName,
                            String thumbUrl, String posterUrl, Integer year, String episodeName) {
        Query query = new Query(Criteria.where("userId").is(userId)
                .and("movieSlug").is(movieSlug)
                .and("episodeSlug").is(episodeSlug));

        Update update = new Update()
                .set("userId", userId)
                .set("movieSlug", movieSlug)
                .set("episodeSlug", episodeSlug)
                .set("serverIndex", serverIndex)
                .set("episodeIndex", episodeIndex)
                .set("watchedAt", Instant.now());

        if (movieName != null) update.set("movieName", movieName);
        if (movieOriginName != null) update.set("movieOriginName", movieOriginName);
        if (thumbUrl != null) update.set("thumbUrl", thumbUrl);
        if (posterUrl != null) update.set("posterUrl", posterUrl);
        if (year != null) update.set("year", year);
        if (episodeName != null) update.set("episodeName", episodeName);

        mongoTemplate.upsert(query, update, WatchHistory.class);
    }

    public void clearHistory(String userId) {
        watchHistoryRepository.deleteByUserId(userId);
    }
}
