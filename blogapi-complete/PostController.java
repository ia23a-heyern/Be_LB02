package com.training.blogapi.controller;

import com.training.blogapi.dto.PostDto;
import com.training.blogapi.model.AppUser;
import com.training.blogapi.model.Post;
import com.training.blogapi.repository.AppUserRepository;
import com.training.blogapi.repository.PostRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostRepository postRepository;
    private final AppUserRepository userRepository;

    public PostController(PostRepository postRepository, AppUserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    // GET /posts → alle Beiträge, aber Content nur wenn eingeloggt
    @GetMapping
    public List<PostDto> getAllPosts(@AuthenticationPrincipal UserDetails user) {
        boolean isAuthenticated = (user != null);
        return postRepository.findAll().stream()
                .map(post -> new PostDto(
                        post.getId(),
                        post.getTitle(),
                        isAuthenticated ? post.getContent() : null
                ))
                .toList();
    }

    // GET /posts/{id} → einzelner Beitrag
    @GetMapping("/{id}")
    public ResponseEntity<PostDto> getPostById(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails user) {
        Optional<Post> opt = postRepository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        Post post = opt.get();
        boolean isAuthenticated = (user != null);
        PostDto dto = new PostDto(
                post.getId(),
                post.getTitle(),
                isAuthenticated ? post.getContent() : null
        );
        return ResponseEntity.ok(dto);
    }

    // POST /posts → Beitrag erstellen
    @PostMapping
    public ResponseEntity<PostDto> createPost(@Valid @RequestBody PostDto dto,
                                              @AuthenticationPrincipal UserDetails user) {
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AppUser appUser = userRepository.findByUsername(user.getUsername()).orElse(null);
        if (appUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Post post = new Post();
        post.setTitle(dto.getTitle());
        post.setContent(dto.getContent());
        post.setUser(appUser);

        Post saved = postRepository.save(post);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new PostDto(saved.getId(), saved.getTitle(), saved.getContent()));
    }

    // DELETE /posts/{id} → Beitrag löschen (nur eigene)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id,
                                           @AuthenticationPrincipal UserDetails user) {
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return postRepository.findById(id)
                .map(post -> {
                    if (!post.getUser().getUsername().equals(user.getUsername())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).<Void>build();
                    }
                    postRepository.delete(post);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
