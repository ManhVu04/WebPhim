package com.example.bephim.service;

import com.example.bephim.model.Comment;
import com.example.bephim.repository.CommentRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class CommentServiceTest {

    private final CommentRepository repository = mock(CommentRepository.class);
    private final CommentService service = new CommentService(repository);

    @Test
    void ownerCanDeleteOwnComment() {
        Comment comment = comment("comment-id", "user-id");
        when(repository.findById("comment-id")).thenReturn(Optional.of(comment));

        assertThat(service.deleteComment("comment-id", "user-id", false))
                .isEqualTo(CommentService.DeleteResult.DELETED);
        verify(repository).delete(comment);
    }

    @Test
    void nonOwnerCannotDeleteComment() {
        Comment comment = comment("comment-id", "owner-id");
        when(repository.findById("comment-id")).thenReturn(Optional.of(comment));

        assertThat(service.deleteComment("comment-id", "other-id", false))
                .isEqualTo(CommentService.DeleteResult.FORBIDDEN);
        verify(repository, never()).delete(any());
    }

    @Test
    void adminCanHideComment() {
        Comment comment = comment("comment-id", "owner-id");
        when(repository.findById("comment-id")).thenReturn(Optional.of(comment));

        assertThat(service.hideComment("comment-id", "admin-id")).isTrue();
        assertThat(comment.isHidden()).isTrue();
        assertThat(comment.getHiddenByUserId()).isEqualTo("admin-id");
        verify(repository).save(comment);
    }

    private static Comment comment(String id, String userId) {
        Comment comment = new Comment();
        comment.setId(id);
        comment.setUserId(userId);
        return comment;
    }
}
