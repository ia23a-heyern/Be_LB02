// Schritt 4: Login-Controller + DTOs
package com.training.blogapi.controller;

import com.training.blogapi.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthController(AuthenticationManager authenticationManager, JwtTokenProvider jwtTokenProvider) {
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody @Valid AuthRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password())
            );
            String token = jwtTokenProvider.createToken(request.username());
            return ResponseEntity.ok(new AuthResponse(token));
        } catch (AuthenticationException e) {
            // Status 401 (Unauthorized) statt 500!
            return ResponseEntity.status(401).body(Map.of("error", "Ungültige Anmeldedaten"));
        }
    }


    public record AuthRequest(String username, String password) {}
    public record AuthResponse(String token) {}
}
