package com.training.blogapi.controller;

import com.training.blogapi.model.Post;
import com.training.blogapi.repository.PostRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
@RestController
@RequestMapping("/upload")
public class UploadController {

    private final Path uploadPath = Paths.get("uploads").toAbsolutePath().normalize();

    public UploadController() throws IOException {
        Files.createDirectories(uploadPath);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file,
                                         HttpServletRequest request) throws IOException {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Datei ist leer.");
        }

        String filename = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = filename.contains(".")
                ? filename.substring(filename.lastIndexOf('.'))
                : "";
        String safeName = System.currentTimeMillis() + extension;

        Path filePath = uploadPath.resolve(safeName);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String fileUrl = String.format("%s://%s:%d/uploads/%s",
                request.getScheme(),
                request.getServerName(),
                request.getServerPort(),
                safeName);

        return ResponseEntity.ok(fileUrl);
    }
}
