package com.gunungrok.save;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * 플레이어 저장 데이터.
 * player/stage/economy 상태를 하나의 JSON 문자열(data)로 보관하고,
 * lastSeen(마지막 저장 시각, epoch millis)은 서버가 저장 시점에 찍는다 → 오프라인 보상 계산 기준.
 */
@Entity
@Table(name = "player_save")
public class PlayerSave {

    @Id
    @Column(name = "user_id")
    private String userId;

    /** {player, stage, economy} 를 담은 JSON 문자열 */
    @Column(name = "data", columnDefinition = "TEXT")
    private String data;

    /** 마지막 저장 시각 (epoch millis) */
    @Column(name = "last_seen")
    private long lastSeen;

    protected PlayerSave() {
    }

    public PlayerSave(String userId, String data, long lastSeen) {
        this.userId = userId;
        this.data = data;
        this.lastSeen = lastSeen;
    }

    public String getUserId() {
        return userId;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public long getLastSeen() {
        return lastSeen;
    }

    public void setLastSeen(long lastSeen) {
        this.lastSeen = lastSeen;
    }
}
