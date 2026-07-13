package com.gunungrok.save;

import org.springframework.data.jpa.repository.JpaRepository;

/** PlayerSave CRUD 리포지토리 */
public interface PlayerSaveRepository extends JpaRepository<PlayerSave, String> {
}
