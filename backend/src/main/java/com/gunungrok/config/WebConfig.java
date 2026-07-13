package com.gunungrok.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS 설정 — 개발 시 프론트(Vite dev 서버)에서 직접 호출할 수 있도록 허용.
 * 운영에서는 Vite 프록시(/api → :8080)를 쓰면 CORS 가 필요 없다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                .allowedMethods("GET", "PUT", "POST", "OPTIONS");
    }
}
