package com.example.bephim.controller;

import com.example.bephim.model.WatchHistory;
import com.example.bephim.service.WatchHistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WatchHistoryControllerProgressTest {

    @Test
    void getProgressReturnsTheSavedPositionForTheAuthenticatedUser() {
        WatchHistoryService service = mock(WatchHistoryService.class);
        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaimAsString("userId")).thenReturn("user-1");

        WatchHistory history = new WatchHistory();
        history.setProgressSeconds(120.0);
        history.setDurationSeconds(600.0);
        when(service.getProgress("user-1", "movie", "episode-1"))
                .thenReturn(Optional.of(history));

        WatchHistoryController controller = new WatchHistoryController(service);
        ResponseEntity<?> response = controller.getProgress(jwt, " movie ", " episode-1 ");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).isEqualTo(Map.of(
                "progressSeconds", 120.0,
                "durationSeconds", 600.0));
        verify(service).getProgress("user-1", "movie", "episode-1");
    }

    @Test
    void getProgressReturnsZerosWhenNoPositionWasSaved() {
        WatchHistoryService service = mock(WatchHistoryService.class);
        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaimAsString("userId")).thenReturn("user-1");
        when(service.getProgress("user-1", "movie", "episode-1"))
                .thenReturn(Optional.empty());

        WatchHistoryController controller = new WatchHistoryController(service);
        ResponseEntity<?> response = controller.getProgress(jwt, "movie", "episode-1");

        assertThat(response.getBody()).isEqualTo(Map.of(
                "progressSeconds", 0,
                "durationSeconds", 0));
    }
}
