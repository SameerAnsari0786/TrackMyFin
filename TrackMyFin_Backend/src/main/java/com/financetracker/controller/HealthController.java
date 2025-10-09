package com.financetracker.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@Slf4j
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        log.info("Health check requested");
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "Finance Tracker API");
        response.put("version", "1.0.0");
        
        return ResponseEntity.ok(response);
    }
}