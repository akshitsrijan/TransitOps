-- =====================================================================
-- TransitOps :: Migration 002
-- Purpose : Remove passenger-transit residue, add proper Users/auth
--           separation, convert Trips + Routes to logistics semantics,
--           and rework Documents to a scalable polymorphic association.
-- Engine  : MySQL 8.0+
-- Applies on top of: schema.sql (original v1)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE transitops;

-- =====================================================================
-- 1. USERS  (new table — authentication identity, decoupled from HR)
--    An employee MAY have a user account (employee_id nullable, unique).
--    A user account MAY exist without an employee record (service /
--    integration / vendor-portal accounts) — this is exactly what the
--    old employees-as-login-identity design could not support.
-- =====================================================================
CREATE TABLE users (
    user_id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id         BIGINT UNSIGNED NULL,
    role_id             BIGINT UNSIGNED NULL,       -- system/authorization role (reuses roles/permissions RBAC)
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

CREATE INDEX idx_users_active ON users (is_active, deleted_at);
CREATE INDEX idx_users_employee ON users (employee_id);

-- =====================================================================
-- 2. SESSIONS  (repoint auth sessions from employees -> users)
-- =====================================================================
ALTER TABLE sessions DROP FOREIGN KEY fk_sessions_employee;
ALTER TABLE sessions DROP INDEX idx_sessions_employee;
ALTER TABLE sessions CHANGE COLUMN employee_id user_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX idx_sessions_user ON sessions (user_id);

-- =====================================================================
-- 3. AUDIT_LOGS  (actor of a change is a system identity, not HR data)
-- =====================================================================
ALTER TABLE audit_logs DROP FOREIGN KEY fk_audit_logs_employee;
ALTER TABLE audit_logs DROP INDEX idx_audit_logs_employee;
ALTER TABLE audit_logs CHANGE COLUMN employee_id user_id BIGINT UNSIGNED NULL;
ALTER TABLE audit_logs
    ADD CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);

-- NOTE: notifications.employee_id is intentionally left as-is. That FK
-- targets who a business notification is *about* (e.g. "your license
-- expires in 30 days"), not an authentication actor, so it stays on
-- employees. Revisit only if notifications must also reach non-employee
-- user accounts.

-- =====================================================================
-- 4. TRIPS  (convert from passenger-transit run to logistics operation)
-- =====================================================================

-- 4a. Remove passenger-transit attribute.
ALTER TABLE trips DROP COLUMN passenger_count;

-- 4b. Add logistics operation fields.
ALTER TABLE trips ADD COLUMN origin        VARCHAR(150)  NULL AFTER driver_id;
ALTER TABLE trips ADD COLUMN destination   VARCHAR(150)  NULL AFTER origin;
ALTER TABLE trips ADD COLUMN trip_purpose  VARCHAR(50)   NOT NULL DEFAULT 'general' AFTER destination;
ALTER TABLE trips ADD COLUMN distance_km   DECIMAL(8,2)  NULL AFTER trip_purpose;

-- 4c. Best-effort backfill for existing rows that were tied to a route
--     (only helps trips that already had a route_id; ad-hoc/unlinked
--     trips will still have NULL origin/destination and must be
--     backfilled manually by the application team before step 4d runs).
UPDATE trips t
JOIN routes r ON r.route_id = t.route_id
SET t.origin = r.origin,
    t.destination = r.destination
WHERE t.origin IS NULL
  AND t.route_id IS NOT NULL;

-- 4d. Enforce NOT NULL once all rows are backfilled.
--     Run this only after confirming: SELECT COUNT(*) FROM trips WHERE origin IS NULL; = 0
ALTER TABLE trips MODIFY COLUMN origin      VARCHAR(150) NOT NULL;
ALTER TABLE trips MODIFY COLUMN destination VARCHAR(150) NOT NULL;

-- 4e. A trip is no longer required to run along a predefined route —
--     routes become an optional reusable template (see section 5).
ALTER TABLE trips DROP FOREIGN KEY fk_trips_route;
ALTER TABLE trips MODIFY COLUMN route_id BIGINT UNSIGNED NULL;
ALTER TABLE trips
    ADD CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(route_id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- 4f. Domain constraints for the new fields.
ALTER TABLE trips
    ADD CONSTRAINT ck_trips_purpose
        CHECK (trip_purpose IN ('delivery','pickup','transfer','relocation','maintenance_run','other'));
ALTER TABLE trips
    ADD CONSTRAINT ck_trips_distance
        CHECK (distance_km IS NULL OR distance_km > 0);

CREATE INDEX idx_trips_purpose ON trips (trip_purpose);

-- =====================================================================
-- 5. ROUTES  (redesignated as optional reusable logistics lanes)
--    Structurally the origin/destination/distance/duration columns were
--    already generic; the only transit assumption was that every trip
--    HAD to reference one, which section 4e removed. Documenting the
--    new intent on the table itself.
-- =====================================================================
ALTER TABLE routes
    COMMENT = 'Reusable logistics lanes/corridor templates. Optional — trips may run without referencing one.';

-- =====================================================================
-- 6. DOCUMENTS  (polymorphic association instead of N nullable FKs)
--    MySQL has no native conditional/polymorphic FK, so owner_id
--    referential integrity is enforced at the application/service
--    layer (validate owner_type + confirm the row exists before
--    insert/update). This trades DB-level enforcement for the ability
--    to attach documents to employees, vehicles, maintenance records,
--    incidents, and trips without schema churn each time a new owner
--    type is introduced.
-- =====================================================================

-- 6a. Add the new discriminator + generic owner columns.
ALTER TABLE documents ADD COLUMN owner_type VARCHAR(20) NULL AFTER document_id;
ALTER TABLE documents ADD COLUMN owner_id   BIGINT UNSIGNED NULL AFTER owner_type;

-- 6b. Backfill from the existing employee/vehicle FKs.
UPDATE documents SET owner_type = 'employee', owner_id = employee_id WHERE employee_id IS NOT NULL;
UPDATE documents SET owner_type = 'vehicle',  owner_id = vehicle_id  WHERE vehicle_id  IS NOT NULL;

-- 6c. Drop the old two-nullable-FK pattern and its supporting objects.
ALTER TABLE documents DROP FOREIGN KEY fk_documents_employee;
ALTER TABLE documents DROP FOREIGN KEY fk_documents_vehicle;
ALTER TABLE documents DROP CHECK ck_documents_owner;
ALTER TABLE documents DROP INDEX idx_documents_employee;
ALTER TABLE documents DROP INDEX idx_documents_vehicle;
ALTER TABLE documents DROP COLUMN employee_id;
ALTER TABLE documents DROP COLUMN vehicle_id;

-- 6d. Enforce the new columns and their domain.
ALTER TABLE documents MODIFY COLUMN owner_type VARCHAR(20) NOT NULL;
ALTER TABLE documents MODIFY COLUMN owner_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE documents
    ADD CONSTRAINT ck_documents_owner_type
        CHECK (owner_type IN ('employee','vehicle','maintenance','incident','trip'));

CREATE INDEX idx_documents_owner ON documents (owner_type, owner_id);

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- END OF MIGRATION 002
-- Manual follow-ups required before this is safe to run on populated data:
--   1. Confirm no trips.origin/destination NULLs remain before step 4d,
--      or backfill them from operational records first.
--   2. Seed at least one row in `users` before repointing any live
--      sessions/audit_log writers, or those inserts will fail on the
--      new NOT NULL / FK constraints.
--   3. Application layer must validate documents.owner_type / owner_id
--      against the correct target table before every insert/update —
--      the database no longer does this for you.
-- =====================================================================
