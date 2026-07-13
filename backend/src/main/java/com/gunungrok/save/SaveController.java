package com.gunungrok.save;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 게임 전체 저장 API.
 *
 *  GET  /api/save?userId=local  → 저장된 {player, stage, economy, lastSeen} (없으면 204)
 *  PUT  /api/save?userId=local  → 본문 {player, stage, economy} 저장, lastSeen 은 서버가 기록
 *  POST /api/save?userId=local  → PUT 과 동일 (navigator.sendBeacon 종료 저장용)
 */
@RestController
@RequestMapping("/api/save")
public class SaveController {

    private final PlayerSaveRepository repository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SaveController(PlayerSaveRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<JsonNode> load(@RequestParam(defaultValue = "local") String userId) throws Exception {
        return repository.findById(userId)
                .map(save -> {
                    try {
                        ObjectNode node = (ObjectNode) objectMapper.readTree(save.getData());
                        node.put("lastSeen", save.getLastSeen());
                        return ResponseEntity.ok((JsonNode) node);
                    } catch (Exception e) {
                        throw new RuntimeException(e);
                    }
                })
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PutMapping
    public SaveResult save(@RequestParam(defaultValue = "local") String userId,
                           @RequestBody JsonNode body) throws Exception {
        long now = System.currentTimeMillis();
        String data = objectMapper.writeValueAsString(body);
        PlayerSave save = repository.findById(userId)
                .orElseGet(() -> new PlayerSave(userId, data, now));
        save.setData(data);
        save.setLastSeen(now);
        repository.save(save);
        return new SaveResult(now);
    }

    /** navigator.sendBeacon 은 POST 만 가능하므로 종료 저장용 별칭 */
    @PostMapping
    public SaveResult saveBeacon(@RequestParam(defaultValue = "local") String userId,
                                 @RequestBody JsonNode body) throws Exception {
        return save(userId, body);
    }

    /** 저장 응답 (서버가 기록한 저장 시각 반환) */
    public record SaveResult(long lastSeen) {
    }
}
