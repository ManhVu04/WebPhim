package com.example.bephim;

import com.example.bephim.controller.CommentController;
import com.example.bephim.controller.FavoriteController;
import com.example.bephim.controller.WatchHistoryController;
import com.example.bephim.dto.CommentRequest;
import com.example.bephim.dto.FavoriteRequest;
import com.example.bephim.dto.WatchHistoryRequest;
import com.example.bephim.service.CommentReportService;
import com.example.bephim.service.CommentService;
import com.example.bephim.service.FavoriteService;
import com.example.bephim.service.RequestRateLimiter;
import com.example.bephim.service.WatchHistoryService;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RequestValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void favoriteMetadataHasBoundedLengthsAndYear() {
        FavoriteRequest request = new FavoriteRequest(
                "x".repeat(201),
                "n".repeat(301),
                null,
                "u".repeat(2049),
                null,
                2200);

        assertThat(validator.validate(request)).hasSize(4);
    }

    @Test
    void watchIndexesMustBeNonNegativeAndBounded() {
        WatchHistoryRequest request = new WatchHistoryRequest(
                "movie",
                "episode",
                -1,
                100001,
                null,
                null,
                null,
                null,
                2026,
                null,
                null,
                null);

        assertThat(validator.validate(request)).hasSize(2);
    }

    @Test
    void commentContentIsRequiredAndBounded() {
        assertThat(validator.validate(new CommentRequest("movie", "x".repeat(1001)))).hasSize(1);
        assertThat(validator.validate(new CommentRequest("movie", ""))).hasSize(1);
    }

    @Test
    void favoritePaginationRejectsNegativePageAndOversizedPage() throws Exception {
        FavoriteController controller = new FavoriteController(mock(FavoriteService.class));
        Method method = FavoriteController.class.getMethod("list", Jwt.class, int.class, int.class);

        assertThat(validator.forExecutables().validateParameters(
                controller, method, new Object[]{null, -1, 101})).hasSize(2);
    }

    @Test
    void historyPaginationRejectsNegativePageAndZeroSize() throws Exception {
        WatchHistoryController controller = new WatchHistoryController(mock(WatchHistoryService.class));
        Method method = WatchHistoryController.class.getMethod("list", Jwt.class, int.class, int.class);

        assertThat(validator.forExecutables().validateParameters(
                controller, method, new Object[]{null, -1, 0})).hasSize(2);
    }

    @Test
    void commentPaginationRejectsMissingSlugNegativePageAndZeroSize() throws Exception {
        CommentController controller = new CommentController(mock(CommentService.class), mock(CommentReportService.class), mock(RequestRateLimiter.class));
        Method method = CommentController.class.getMethod("list", Jwt.class, String.class, int.class, int.class);

        assertThat(validator.forExecutables().validateParameters(
                controller, method, new Object[]{null, "", -1, 0})).hasSize(3);
    }
}
