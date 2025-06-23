package com.training.blogapi.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/me")
public class MeController {

    @GetMapping
    public ResponseEntity<?> getMe(@AuthenticationPrincipal UserDetails user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Nicht eingeloggt"));
        }

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "roles", user.getAuthorities().stream()
                        .map(a -> a.getAuthority()) // z. B. "ROLE_ADMIN"
                        .toList()
        ));
    }
}
