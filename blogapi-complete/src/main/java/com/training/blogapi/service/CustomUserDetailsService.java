package com.training.blogapi.service;

import com.training.blogapi.model.AppUser;
import com.training.blogapi.repository.AppUserRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepository;

    public CustomUserDetailsService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        System.out.println(">>>>>>>>>Lade User: " + username);
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Benutzer nicht gefunden: " + username));

        return User.builder()
                .username(user.getUsername())
                .password(user.getPassword()) // → verschlüsseltes Passwort
                .roles(user.getRoles().toArray(new String[0])) // → wichtig: wird zu ROLE_...
                .build();
    }
}
