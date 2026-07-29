package com.example.bephim.service;

import com.example.bephim.model.Comment;
import com.example.bephim.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.Instant;

import org.springframework.data.domain.Sort;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;

    public Page<Comment> listAdminComments(String search, Boolean hiddenFilter, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean hasSearch = search != null && !search.isBlank();

        if (hasSearch && hiddenFilter != null) {
            String trimmed = search.trim();
            return commentRepository.findByHiddenAndMovieSlugContainingIgnoreCaseOrHiddenAndUsernameContainingIgnoreCaseOrHiddenAndContentContainingIgnoreCase(
                    hiddenFilter, trimmed, hiddenFilter, trimmed, hiddenFilter, trimmed, pageable);
        } else if (hasSearch) {
            String trimmed = search.trim();
            return commentRepository.findByMovieSlugContainingIgnoreCaseOrUsernameContainingIgnoreCaseOrContentContainingIgnoreCase(
                    trimmed, trimmed, trimmed, pageable);
        } else if (hiddenFilter != null) {
            return commentRepository.findByHidden(hiddenFilter, pageable);
        } else {
            return commentRepository.findAll(pageable);
        }
    }

    public Page<Comment> listVisible(String movieSlug, int page, int size) {
        return commentRepository.findByMovieSlugAndHiddenFalseOrderByCreatedAtDesc(
                movieSlug.trim(),
                PageRequest.of(page, size));
    }

    public Comment addComment(
            String userId,
            String username,
            String displayName,
            String movieSlug,
            String content) {
        Comment comment = new Comment();
        comment.setUserId(userId);
        comment.setUsername(username);
        comment.setDisplayName(displayName);
        comment.setMovieSlug(movieSlug.trim());
        comment.setContent(content.trim());
        comment.setCreatedAt(Instant.now());
        return commentRepository.save(comment);
    }

    public DeleteResult deleteComment(String id, String userId, boolean admin) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return DeleteResult.NOT_FOUND;
        if (!admin && !userId.equals(comment.getUserId())) return DeleteResult.FORBIDDEN;
        commentRepository.delete(comment);
        return DeleteResult.DELETED;
    }

    public boolean hideComment(String id, String adminUserId) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return false;
        comment.setHidden(true);
        comment.setHiddenAt(Instant.now());
        comment.setHiddenByUserId(adminUserId);
        commentRepository.save(comment);
        return true;
    }

    public boolean unhideComment(String id) {
        Comment comment = commentRepository.findById(id).orElse(null);
        if (comment == null) return false;
        comment.setHidden(false);
        comment.setHiddenAt(null);
        comment.setHiddenByUserId(null);
        commentRepository.save(comment);
        return true;
    }

    public long countTotalComments() {
        return commentRepository.count();
    }

    public long countHiddenComments() {
        return commentRepository.countByHiddenTrue();
    }

    public enum DeleteResult {
        DELETED,
        NOT_FOUND,
        FORBIDDEN
    }
}
