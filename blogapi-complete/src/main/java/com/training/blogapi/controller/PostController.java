// PostController.java
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

@RestController
@RequestMapping("/posts")
public class PostController {

    private final PostRepository postRepository;
    private final AppUserRepository userRepository;

    public PostController(PostRepository postRepository, AppUserRepository userRepository) {
        this.postRepository = postRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<PostDto> getAllPosts(@AuthenticationPrincipal UserDetails user) {
        boolean isAuthenticated = (user != null);
        return postRepository.findAll().stream()
                .map(post -> new PostDto(
                        post.getId(),
                        post.getTitle(),
                        isAuthenticated ? post.getContent() : null,
                        isAuthenticated ? post.getImagePath() : null   // <--- HIER!
                ))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostDto> getPostById(@PathVariable Long id,
                                               @AuthenticationPrincipal UserDetails user) {
        return postRepository.findById(id)
                .map(post -> {
                    boolean isAuthenticated = (user != null);
                    return ResponseEntity.ok(new PostDto(
                            post.getId(),
                            post.getTitle(),
                            isAuthenticated ? post.getContent() : null,
                            isAuthenticated ? post.getImagePath() : null  // <--- HIER!
                    ));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PostDto> createPost(@Valid @RequestBody PostDto dto,
                                              @AuthenticationPrincipal UserDetails user) {
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        AppUser appUser = userRepository.findByUsername(user.getUsername()).orElse(null);
        if (appUser == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        Post post = new Post();
        post.setTitle(dto.getTitle());
        post.setContent(dto.getContent());
        post.setImagePath(dto.getImagePath());
        post.setUser(appUser);

        Post saved = postRepository.save(post);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new PostDto(saved.getId(), saved.getTitle(), saved.getContent(), saved.getImagePath()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id,
                                           @AuthenticationPrincipal UserDetails user) {
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        return postRepository.findById(id)
                .map(post -> {
                    if (!post.getUser().getUsername().equals(user.getUsername())) {
                        return new ResponseEntity<Void>(HttpStatus.FORBIDDEN);
                    }
                    postRepository.delete(post);
                    return new ResponseEntity<Void>(HttpStatus.NO_CONTENT);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PostDto> updatePost(
            @PathVariable Long id,
            @RequestBody PostDto dto,
            @AuthenticationPrincipal UserDetails user) {
        if (user == null) return ResponseEntity.status(401).build();

        var optPost = postRepository.findById(id);
        if (optPost.isEmpty()) return ResponseEntity.notFound().build();

        Post post = optPost.get();
        if (!post.getUser().getUsername().equals(user.getUsername())) {
            return ResponseEntity.status(403).build();
        }
        post.setTitle(dto.getTitle());
        post.setContent(dto.getContent());
        post.setImagePath(dto.getImagePath());

        Post saved = postRepository.save(post);
        return ResponseEntity.ok(new PostDto(
                saved.getId(),
                saved.getTitle(),
                saved.getContent(),
                saved.getImagePath()
        ));
    }




}
