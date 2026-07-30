package com.example.bephim.service;

import com.example.bephim.model.WatchHistory;
import com.example.bephim.repository.WatchHistoryRepository;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WatchHistoryServiceTest {

    @Mock
    private WatchHistoryRepository watchHistoryRepository;

    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private WatchHistoryService watchHistoryService;

    @Test
    void recordWatchPersistsPlaybackProgressAndDuration() {
        watchHistoryService.recordWatch(
                "user-1",
                "movie",
                "episode-1",
                2,
                7,
                "Movie",
                "Original",
                "thumb",
                "poster",
                2026,
                "8",
                120.0,
                600.0);

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).upsert(
                queryCaptor.capture(),
                updateCaptor.capture(),
                eq(WatchHistory.class));

        assertThat(queryCaptor.getValue().getQueryObject())
                .containsEntry("userId", "user-1")
                .containsEntry("movieSlug", "movie")
                .containsEntry("episodeSlug", "episode-1");

        Document values = (Document) updateCaptor.getValue().getUpdateObject().get("$set");
        assertThat(values)
                .containsEntry("progressSeconds", 120.0)
                .containsEntry("durationSeconds", 600.0)
                .containsEntry("serverIndex", 2)
                .containsEntry("episodeIndex", 7);
    }

    @Test
    void getProgressUsesTheUserMovieAndEpisodeKey() {
        WatchHistory history = new WatchHistory();
        history.setProgressSeconds(120.0);
        when(watchHistoryRepository.findByUserIdAndMovieSlugAndEpisodeSlug(
                "user-1", "movie", "episode-1"))
                .thenReturn(Optional.of(history));

        assertThat(watchHistoryService.getProgress("user-1", "movie", "episode-1"))
                .contains(history);
    }
}
