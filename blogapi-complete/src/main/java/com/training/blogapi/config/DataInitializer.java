package com.training.blogapi.config;

import com.training.blogapi.model.AppUser;
import com.training.blogapi.model.Post;
import com.training.blogapi.repository.AppUserRepository;
import com.training.blogapi.repository.PostRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final AppUserRepository userRepository;
    private final PostRepository postRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(AppUserRepository userRepository,
                           PostRepository postRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.postRepository = postRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        AppUser max = userRepository.findByUsername("Max15").orElseGet(() -> {
            AppUser user = new AppUser();
            user.setUsername("Max15");
            user.setPassword(passwordEncoder.encode("Stern3849"));
            user.setRoles(Set.of("ADMIN", "USER"));
            System.out.println("✔ Benutzer 'Max15' angelegt");
            return userRepository.save(user);
        });

        userRepository.findByUsername("Berta").orElseGet(() -> {
            AppUser user = new AppUser();
            user.setUsername("Berta");
            user.setPassword(passwordEncoder.encode("Sonne2024"));
            user.setRoles(Set.of("READER"));
            System.out.println("✔ Benutzer 'Berta' angelegt");
            return userRepository.save(user);
        });

        if (postRepository.count() == 0) {
            Post post = new Post();
            post.setTitle("Erster Beitrag");
            post.setContent("Willkommen im Blog!");
            post.setUser(max); // ← wichtig!
            postRepository.save(post);
            System.out.println("✔ Beispiel-Post gespeichert");
        }
    }
}
