package com.gunungrok;

import java.io.File;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 군웅록 게임 데이터 저장 API 서버 진입점 */
@SpringBootApplication
public class GunungrokApplication {
    public static void main(String[] args) {
        // SQLite DB 파일이 놓일 디렉토리를 미리 생성 (없으면 연결 실패)
        new File("data").mkdirs();
        SpringApplication.run(GunungrokApplication.class, args);
    }
}
