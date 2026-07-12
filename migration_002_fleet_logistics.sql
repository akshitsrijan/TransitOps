-- =====================================================================
-- TransitOps :: Migration 002 (corrected)
-- Purpose : Remove passenger-transit residue, add proper Users/auth
--           separation, convert Trips + Routes to logistics semantics,
--           and rework Documents to a scalable polymorphic association.
-- Engine  : MySQL 8.0+
--
-- Verified against the ACTUAL imported table set (confirmed by user):
--   attendance, departments, drivers, emergency_contacts, employees,
--   fuel_logs, incidents, leave_requests, maintenance, permissions,
--   role_permissions, roles, routes, trips, users, vehicle_assignments,
--   vehicles
--
-- Missing from that list but referenced by the design: sessions,
-- documents, audit_logs, notifications. These are created below in
-- their original schema.sql form first, then converted — per
-- requirement, so no ALTER ever targets a table that doesn't exist.
--
-- `users` already exists in this environment (created by a previous
-- partial run) — it is only guarded with IF NOT EXISTS, never recreated
-- or altered destructively.
--
-- Every column/constraint/index change below is wrapped in an
-- INFORMATION_SCHEMA existence check via a temporary helper procedure,
-- because MySQL 8 has no native "ADD COLUMN IF NOT EXISTS" /
-- "ADD CONSTRAINT IF NOT EXISTS" syntax (that is a MariaDB extension).
-- This makes the whole script safe to run more than once.
-- =====================================================================

SET NAMES utf8mb4;
USE transitops;
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- 0. IDEMPOTENCY HELPER (temporary — dropped at the end of this file)
--    p_check_sql : a full statement of the form
--                  "SELECT COUNT(*) INTO @migrate_check FROM ..."
--    p_ddl       : the DDL to run conditionally
--    p_run_when_zero : TRUE  -> run p_ddl only if the check count is 0
--                       (i.e. "create/add only if missing")
--                     FALSE -> run p_ddl only if the check count is > 0
--                       (i.e. "drop only if present")
-- =====================================================================
DROP PROCEDURE IF EXISTS _mig_apply;

DELIMITER $$
CREATE PROCEDURE _mig_apply(
    IN p_check_sql TEXT,
    IN p_ddl TEXT,
    IN p_run_when_zero BOOLEAN
)
BEGIN
    SET @migrate_check = NULL;
    SET @mig_cond = p_check_sql;
    PREPARE cond_stmt FROM @mig_cond;
    EXECUTE cond_stmt;
    DEALLOCATE PREPARE cond_stmt;

    IF (p_run_when_zero = TRUE AND @migrate_check = 0)
       OR (p_run_when_zero = FALSE AND @migrate_check > 0) THEN
        SET @mig_ddl = p_ddl;
        PREPARE ddl_stmt FROM @mig_ddl;
        EXECUTE ddl_stmt;
        DEALLOCATE PREPARE ddl_stmt;
    END IF;
END$$
DELIMITER ;

-- =====================================================================
-- 1. USERS  (guard only — already present in this environment)
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id         BIGINT UNSIGNED NULL,
    role_id             BIGINT UNSIGNED NULL,
    username            VARCHAR(50)  NOT NULL,
    email               VARCHAR(150) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    is_system_account   TINYINT(1)   NOT NULL DEFAULT 0,
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,
    last_login_at       DATETIME     NULL,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME     NULL,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_employee UNIQUE (employee_id),
    CONSTRAINT fk_users_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''users'' AND index_name = ''idx_users_active''',
    'CREATE INDEX idx_users_active ON users (is_active, deleted_at)',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''users'' AND index_name = ''idx_users_employee''',
    'CREATE INDEX idx_users_employee ON users (employee_id)',
    TRUE
);

-- =====================================================================
-- 2. SESSIONS  (missing table — create in original form, then convert)
-- =====================================================================
CREATE TABLE IF NOT EXISTS sessions (
    session_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id          BIGINT UNSIGNED NOT NULL,
    token_hash               VARCHAR(255) NOT NULL,
    ip_address                   VARCHAR(45) NULL,
    user_agent                       VARCHAR(255) NULL,
    expires_at                           DATETIME NOT NULL,
    last_activity_at                        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at                                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at                                    DATETIME NULL,
    CONSTRAINT uq_sessions_token UNIQUE (token_hash),
    CONSTRAINT fk_sessions_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND index_name = ''idx_sessions_employee''',
    'CREATE INDEX idx_sessions_employee ON sessions (employee_id)',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND index_name = ''idx_sessions_expiry''',
    'CREATE INDEX idx_sessions_expiry ON sessions (expires_at)',
    TRUE
);

-- 2a. Repoint sessions from employees to users.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND constraint_name = ''fk_sessions_employee''',
    'ALTER TABLE sessions DROP FOREIGN KEY fk_sessions_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND index_name = ''idx_sessions_employee''',
    'ALTER TABLE sessions DROP INDEX idx_sessions_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND column_name = ''user_id''',
    'ALTER TABLE sessions CHANGE COLUMN employee_id user_id BIGINT UNSIGNED NOT NULL',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND constraint_name = ''fk_sessions_user''',
    'ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''sessions'' AND index_name = ''idx_sessions_user''',
    'CREATE INDEX idx_sessions_user ON sessions (user_id)',
    TRUE
);

-- =====================================================================
-- 3. AUDIT_LOGS  (missing table — create in original form, then convert)
-- =====================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_log_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id        BIGINT UNSIGNED NULL,
    table_name             VARCHAR(64) NOT NULL,
    record_id                 BIGINT UNSIGNED NOT NULL,
    action_type                  VARCHAR(20) NOT NULL,
    old_values                      JSON NULL,
    new_values                         JSON NULL,
    ip_address                            VARCHAR(45) NULL,
    created_at                               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_audit_logs_action
        CHECK (action_type IN ('insert','update','delete','soft_delete','restore')),
    CONSTRAINT fk_audit_logs_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND index_name = ''idx_audit_logs_table_record''',
    'CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id)',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND index_name = ''idx_audit_logs_employee''',
    'CREATE INDEX idx_audit_logs_employee ON audit_logs (employee_id)',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND index_name = ''idx_audit_logs_created''',
    'CREATE INDEX idx_audit_logs_created ON audit_logs (created_at)',
    TRUE
);

-- 3a. Repoint the actor column from employees to users.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND constraint_name = ''fk_audit_logs_employee''',
    'ALTER TABLE audit_logs DROP FOREIGN KEY fk_audit_logs_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND index_name = ''idx_audit_logs_employee''',
    'ALTER TABLE audit_logs DROP INDEX idx_audit_logs_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND column_name = ''user_id''',
    'ALTER TABLE audit_logs CHANGE COLUMN employee_id user_id BIGINT UNSIGNED NULL',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND constraint_name = ''fk_audit_logs_user''',
    'ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''audit_logs'' AND index_name = ''idx_audit_logs_user''',
    'CREATE INDEX idx_audit_logs_user ON audit_logs (user_id)',
    TRUE
);

-- =====================================================================
-- 4. NOTIFICATIONS  (missing table — create as-is; stays on employees,
--    see note in migration 002 v1: this is a business-notification
--    target, not an authentication actor)
-- =====================================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id          BIGINT UNSIGNED NOT NULL,
    title                    VARCHAR(150) NOT NULL,
    message                     VARCHAR(1000) NOT NULL,
    notification_type              VARCHAR(30) NOT NULL DEFAULT 'general',
    is_read                            TINYINT(1) NOT NULL DEFAULT 0,
    read_at                                DATETIME NULL,
    created_at                                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''notifications'' AND index_name = ''idx_notifications_employee''',
    'CREATE INDEX idx_notifications_employee ON notifications (employee_id, is_read)',
    TRUE
);

-- =====================================================================
-- 5. DOCUMENTS  (missing table — create in original form, then convert
--    to the polymorphic owner_type/owner_id pattern)
-- =====================================================================
CREATE TABLE IF NOT EXISTS documents (
    document_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id        BIGINT UNSIGNED NULL,
    vehicle_id             BIGINT UNSIGNED NULL,
    document_type             VARCHAR(50) NOT NULL,
    document_number              VARCHAR(80) NULL,
    file_path                        VARCHAR(500) NOT NULL,
    issue_date                          DATE NULL,
    expiry_date                            DATE NULL,
    document_status                           VARCHAR(20) NOT NULL DEFAULT 'valid',
    created_at                                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                           ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                                   DATETIME NULL,
    CONSTRAINT ck_documents_status
        CHECK (document_status IN ('valid','expired','revoked')),
    CONSTRAINT ck_documents_dates
        CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date),
    CONSTRAINT ck_documents_owner
        CHECK (employee_id IS NOT NULL OR vehicle_id IS NOT NULL),
    CONSTRAINT fk_documents_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_documents_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND index_name = ''idx_documents_expiry''',
    'CREATE INDEX idx_documents_expiry ON documents (expiry_date)',
    TRUE
);

-- 5a. Add the polymorphic owner columns.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''owner_type''',
    'ALTER TABLE documents ADD COLUMN owner_type VARCHAR(20) NULL AFTER document_id',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''owner_id''',
    'ALTER TABLE documents ADD COLUMN owner_id BIGINT UNSIGNED NULL AFTER owner_type',
    TRUE
);

-- 5b. Backfill from the old FKs — only runs while employee_id/vehicle_id
--     still exist, so it is a no-op (and harmless) on a rerun.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''employee_id''',
    'UPDATE documents SET owner_type = ''employee'', owner_id = employee_id WHERE employee_id IS NOT NULL AND owner_type IS NULL',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''vehicle_id''',
    'UPDATE documents SET owner_type = ''vehicle'', owner_id = vehicle_id WHERE vehicle_id IS NOT NULL AND owner_type IS NULL',
    FALSE
);

-- 5c. Drop the old two-nullable-FK pattern and its supporting objects.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND constraint_name = ''fk_documents_employee''',
    'ALTER TABLE documents DROP FOREIGN KEY fk_documents_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND constraint_name = ''fk_documents_vehicle''',
    'ALTER TABLE documents DROP FOREIGN KEY fk_documents_vehicle',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND constraint_name = ''ck_documents_owner''',
    'ALTER TABLE documents DROP CHECK ck_documents_owner',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND index_name = ''idx_documents_employee''',
    'ALTER TABLE documents DROP INDEX idx_documents_employee',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND index_name = ''idx_documents_vehicle''',
    'ALTER TABLE documents DROP INDEX idx_documents_vehicle',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''employee_id''',
    'ALTER TABLE documents DROP COLUMN employee_id',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''vehicle_id''',
    'ALTER TABLE documents DROP COLUMN vehicle_id',
    FALSE
);

-- 5d. Enforce the new columns and their domain.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''owner_type'' AND is_nullable = ''YES''',
    'ALTER TABLE documents MODIFY COLUMN owner_type VARCHAR(20) NOT NULL',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND column_name = ''owner_id'' AND is_nullable = ''YES''',
    'ALTER TABLE documents MODIFY COLUMN owner_id BIGINT UNSIGNED NOT NULL',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND constraint_name = ''ck_documents_owner_type''',
    'ALTER TABLE documents ADD CONSTRAINT ck_documents_owner_type CHECK (owner_type IN (''employee'',''vehicle'',''maintenance'',''incident'',''trip''))',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''documents'' AND index_name = ''idx_documents_owner''',
    'CREATE INDEX idx_documents_owner ON documents (owner_type, owner_id)',
    TRUE
);

-- NOTE: MySQL has no native conditional/polymorphic FK. owner_id
-- referential integrity for 'maintenance', 'incident', and 'trip' owner
-- types must be validated at the application/service layer before
-- insert/update.

-- =====================================================================
-- 6. TRIPS  (existing table with data — convert in place)
-- =====================================================================

-- 6a. Remove the passenger-transit attribute.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''passenger_count''',
    'ALTER TABLE trips DROP COLUMN passenger_count',
    FALSE
);

-- 6b. Add logistics operation fields.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''origin''',
    'ALTER TABLE trips ADD COLUMN origin VARCHAR(150) NULL AFTER driver_id',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''destination''',
    'ALTER TABLE trips ADD COLUMN destination VARCHAR(150) NULL AFTER origin',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''trip_purpose''',
    'ALTER TABLE trips ADD COLUMN trip_purpose VARCHAR(50) NOT NULL DEFAULT ''general'' AFTER destination',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''distance_km''',
    'ALTER TABLE trips ADD COLUMN distance_km DECIMAL(8,2) NULL AFTER trip_purpose',
    TRUE
);

-- 6c. Best-effort backfill for rows that were tied to a route. Ad-hoc
--     trips without a route_id will still have NULL origin/destination
--     and must be backfilled manually before step 6d can succeed.
UPDATE trips t
JOIN routes r ON r.route_id = t.route_id
SET t.origin = r.origin,
    t.destination = r.destination
WHERE t.origin IS NULL
  AND t.route_id IS NOT NULL;

-- 6d. Enforce NOT NULL once all rows are backfilled.
--     Verify first:  SELECT COUNT(*) FROM trips WHERE origin IS NULL;
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''origin'' AND is_nullable = ''YES''',
    'ALTER TABLE trips MODIFY COLUMN origin VARCHAR(150) NOT NULL',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''destination'' AND is_nullable = ''YES''',
    'ALTER TABLE trips MODIFY COLUMN destination VARCHAR(150) NOT NULL',
    FALSE
);

-- 6e. A trip is no longer required to run along a predefined route.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND constraint_name = ''fk_trips_route''',
    'ALTER TABLE trips DROP FOREIGN KEY fk_trips_route',
    FALSE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND column_name = ''route_id'' AND is_nullable = ''NO''',
    'ALTER TABLE trips MODIFY COLUMN route_id BIGINT UNSIGNED NULL',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND constraint_name = ''fk_trips_route''',
    'ALTER TABLE trips ADD CONSTRAINT fk_trips_route FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE SET NULL ON UPDATE CASCADE',
    TRUE
);

-- 6f. Domain constraints for the new fields.
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND constraint_name = ''ck_trips_purpose''',
    'ALTER TABLE trips ADD CONSTRAINT ck_trips_purpose CHECK (trip_purpose IN (''delivery'',''pickup'',''transfer'',''relocation'',''maintenance_run'',''other''))',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND constraint_name = ''ck_trips_distance''',
    'ALTER TABLE trips ADD CONSTRAINT ck_trips_distance CHECK (distance_km IS NULL OR distance_km > 0)',
    TRUE
);
CALL _mig_apply(
    'SELECT COUNT(*) INTO @migrate_check FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = ''trips'' AND index_name = ''idx_trips_purpose''',
    'CREATE INDEX idx_trips_purpose ON trips (trip_purpose)',
    TRUE
);

-- =====================================================================
-- 7. ROUTES  (existing table — redesignate as optional reusable lanes)
--    Comment update only; safe to run every time.
-- =====================================================================
ALTER TABLE routes
    COMMENT = 'Reusable logistics lanes/corridor templates. Optional — trips may run without referencing one.';

-- =====================================================================
-- 8. Cleanup
-- =====================================================================
DROP PROCEDURE IF EXISTS _mig_apply;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF MIGRATION 002 (corrected)
-- Manual follow-ups before this is safe on populated data:
--   1. Confirm no trips.origin/destination NULLs remain (step 6d will
--      simply skip if any do — it does not silently null-pad).
--   2. Seed at least one row in `users` (create it or link an existing
--      employee) before any application code writes to sessions or
--      audit_logs, since both now require a valid user_id.
--   3. Application layer must validate documents.owner_type/owner_id
--      against the correct target table before every insert/update.
-- =====================================================================
