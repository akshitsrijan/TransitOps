-- =====================================================================
-- TransitOps :: Fleet & Workforce Management Database Schema
-- Engine   : MySQL 8.0+
-- Charset  : utf8mb4 / utf8mb4_unicode_ci
-- Normal Form: 3NF (every non-key attribute depends on the key,
--              the whole key, and nothing but the key)
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS transitops
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE transitops;

-- =====================================================================
-- 1. DEPARTMENTS
-- =====================================================================
CREATE TABLE departments (
    department_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    department_code      VARCHAR(20)  NOT NULL,
    department_name      VARCHAR(120) NOT NULL,
    description          VARCHAR(500) NULL,
    is_active             TINYINT(1)   NOT NULL DEFAULT 1,
    created_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at            DATETIME     NULL,
    CONSTRAINT uq_departments_code UNIQUE (department_code)
) ENGINE=InnoDB;

CREATE INDEX idx_departments_active ON departments (is_active, deleted_at);

-- =====================================================================
-- 2. ROLES
-- =====================================================================
CREATE TABLE roles (
    role_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_code      VARCHAR(30)  NOT NULL,
    role_name      VARCHAR(100) NOT NULL,
    description    VARCHAR(500) NULL,
    is_active      TINYINT(1)   NOT NULL DEFAULT 1,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME     NULL,
    CONSTRAINT uq_roles_code UNIQUE (role_code)
) ENGINE=InnoDB;

-- =====================================================================
-- 3. PERMISSIONS
-- =====================================================================
CREATE TABLE permissions (
    permission_id   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    permission_code  VARCHAR(60)  NOT NULL,
    permission_name  VARCHAR(150) NOT NULL,
    description      VARCHAR(500) NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_permissions_code UNIQUE (permission_code)
) ENGINE=InnoDB;

-- Junction table resolving the many-to-many between roles and permissions
CREATE TABLE role_permissions (
    role_id        BIGINT UNSIGNED NOT NULL,
    permission_id  BIGINT UNSIGNED NOT NULL,
    granted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions(permission_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- 4. EMPLOYEES  (superset entity; drivers extend this table 1:1)
-- =====================================================================
CREATE TABLE employees (
    employee_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_code     VARCHAR(20)  NOT NULL,
    first_name        VARCHAR(80)  NOT NULL,
    last_name         VARCHAR(80)  NOT NULL,
    email             VARCHAR(150) NOT NULL,
    phone             VARCHAR(20)  NOT NULL,
    date_of_birth     DATE         NULL,
    hire_date         DATE         NOT NULL,
    termination_date  DATE         NULL,
    department_id     BIGINT UNSIGNED NOT NULL,
    role_id           BIGINT UNSIGNED NOT NULL,
    manager_id        BIGINT UNSIGNED NULL,          -- self-referencing hierarchy
    employment_status VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
    deleted_at        DATETIME     NULL,
    CONSTRAINT uq_employees_code UNIQUE (employee_code),
    CONSTRAINT uq_employees_email UNIQUE (email),
    CONSTRAINT ck_employees_status
        CHECK (employment_status IN ('active','on_leave','suspended','terminated')),
    CONSTRAINT ck_employees_dates
        CHECK (termination_date IS NULL OR termination_date >= hire_date),
    CONSTRAINT fk_employees_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_employees_role
        FOREIGN KEY (role_id) REFERENCES roles(role_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_employees_manager
        FOREIGN KEY (manager_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_employees_department ON employees (department_id);
CREATE INDEX idx_employees_role ON employees (role_id);
CREATE INDEX idx_employees_manager ON employees (manager_id);
CREATE INDEX idx_employees_status ON employees (employment_status, deleted_at);

-- =====================================================================
-- 5. DRIVERS  (1:1 extension of employees who hold a driving license)
-- =====================================================================
CREATE TABLE drivers (
    driver_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id         BIGINT UNSIGNED NOT NULL,
    license_number       VARCHAR(50)  NOT NULL,
    license_class         VARCHAR(10)  NOT NULL,
    license_issue_date    DATE         NOT NULL,
    license_expiry_date   DATE         NOT NULL,
    years_of_experience   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    driver_status         VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,
    deleted_at             DATETIME     NULL,
    CONSTRAINT uq_drivers_employee UNIQUE (employee_id),
    CONSTRAINT uq_drivers_license_number UNIQUE (license_number),
    CONSTRAINT ck_drivers_status
        CHECK (driver_status IN ('active','suspended','inactive')),
    CONSTRAINT ck_drivers_license_dates
        CHECK (license_expiry_date > license_issue_date),
    CONSTRAINT fk_drivers_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_drivers_status ON drivers (driver_status, deleted_at);
CREATE INDEX idx_drivers_license_expiry ON drivers (license_expiry_date);

-- =====================================================================
-- 6. VEHICLES
-- =====================================================================
CREATE TABLE vehicles (
    vehicle_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_code          VARCHAR(20)  NOT NULL,
    registration_number    VARCHAR(30)  NOT NULL,
    make                   VARCHAR(60)  NOT NULL,
    model                  VARCHAR(60)  NOT NULL,
    manufacture_year       SMALLINT UNSIGNED NOT NULL,
    capacity               SMALLINT UNSIGNED NOT NULL,
    fuel_type               VARCHAR(20)  NOT NULL,
    odometer_reading        INT UNSIGNED NOT NULL DEFAULT 0,
    vehicle_status           VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
    deleted_at               DATETIME     NULL,
    CONSTRAINT uq_vehicles_code UNIQUE (vehicle_code),
    CONSTRAINT uq_vehicles_registration UNIQUE (registration_number),
    CONSTRAINT ck_vehicles_fuel_type
        CHECK (fuel_type IN ('diesel','petrol','cng','electric','hybrid')),
    CONSTRAINT ck_vehicles_status
        CHECK (vehicle_status IN ('active','in_maintenance','decommissioned')),
    CONSTRAINT ck_vehicles_capacity CHECK (capacity > 0)
) ENGINE=InnoDB;

CREATE INDEX idx_vehicles_status ON vehicles (vehicle_status, deleted_at);

-- =====================================================================
-- 7. ROUTES
-- =====================================================================
CREATE TABLE routes (
    route_id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    route_code              VARCHAR(20)  NOT NULL,
    route_name               VARCHAR(150) NOT NULL,
    origin                   VARCHAR(150) NOT NULL,
    destination               VARCHAR(150) NOT NULL,
    distance_km                DECIMAL(8,2) NOT NULL,
    estimated_duration_minutes  SMALLINT UNSIGNED NOT NULL,
    route_status                VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                  DATETIME     NULL,
    CONSTRAINT uq_routes_code UNIQUE (route_code),
    CONSTRAINT ck_routes_status
        CHECK (route_status IN ('active','suspended','retired')),
    CONSTRAINT ck_routes_distance CHECK (distance_km > 0)
) ENGINE=InnoDB;

-- =====================================================================
-- 8. TRIPS  (each trip runs a route, on a vehicle, with a driver)
-- =====================================================================
CREATE TABLE trips (
    trip_id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_code                 VARCHAR(30)  NOT NULL,
    route_id                   BIGINT UNSIGNED NOT NULL,
    vehicle_id                  BIGINT UNSIGNED NOT NULL,
    driver_id                    BIGINT UNSIGNED NOT NULL,
    scheduled_departure           DATETIME NOT NULL,
    scheduled_arrival              DATETIME NOT NULL,
    actual_departure                DATETIME NULL,
    actual_arrival                   DATETIME NULL,
    passenger_count                   SMALLINT UNSIGNED NULL,
    trip_status                        VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at                          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                          DATETIME NULL,
    CONSTRAINT uq_trips_code UNIQUE (trip_code),
    CONSTRAINT ck_trips_status
        CHECK (trip_status IN ('scheduled','in_progress','completed','cancelled','delayed')),
    CONSTRAINT ck_trips_scheduled_window
        CHECK (scheduled_arrival > scheduled_departure),
    CONSTRAINT ck_trips_actual_window
        CHECK (actual_arrival IS NULL OR actual_departure IS NULL OR actual_arrival >= actual_departure),
    CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(route_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trips_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_trips_driver
        FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_trips_route ON trips (route_id);
CREATE INDEX idx_trips_vehicle ON trips (vehicle_id);
CREATE INDEX idx_trips_driver ON trips (driver_id);
CREATE INDEX idx_trips_status ON trips (trip_status, deleted_at);
CREATE INDEX idx_trips_departure ON trips (scheduled_departure);

-- =====================================================================
-- 9. FUEL LOGS
-- =====================================================================
CREATE TABLE fuel_logs (
    fuel_log_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id         BIGINT UNSIGNED NOT NULL,
    driver_id            BIGINT UNSIGNED NULL,
    trip_id                BIGINT UNSIGNED NULL,
    fuel_date                DATE NOT NULL,
    liters                     DECIMAL(8,2) NOT NULL,
    cost_per_liter               DECIMAL(8,2) NOT NULL,
    total_cost                     DECIMAL(10,2) NOT NULL,
    odometer_reading                 INT UNSIGNED NOT NULL,
    fuel_station                       VARCHAR(150) NULL,
    created_at                          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                  ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_fuel_logs_liters CHECK (liters > 0),
    CONSTRAINT ck_fuel_logs_cost CHECK (total_cost >= 0 AND cost_per_liter >= 0),
    CONSTRAINT fk_fuel_logs_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_fuel_logs_driver
        FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_fuel_logs_trip
        FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_fuel_logs_vehicle ON fuel_logs (vehicle_id, fuel_date);
CREATE INDEX idx_fuel_logs_driver ON fuel_logs (driver_id);

-- =====================================================================
-- 10. MAINTENANCE
-- =====================================================================
CREATE TABLE maintenance (
    maintenance_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id            BIGINT UNSIGNED NOT NULL,
    performed_by_id         BIGINT UNSIGNED NULL,       -- employee/mechanic
    maintenance_type          VARCHAR(50) NOT NULL,
    description                 VARCHAR(500) NULL,
    cost                          DECIMAL(10,2) NOT NULL DEFAULT 0,
    scheduled_date                  DATE NOT NULL,
    completed_date                    DATE NULL,
    maintenance_status                  VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    created_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                    ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                            DATETIME NULL,
    CONSTRAINT ck_maintenance_status
        CHECK (maintenance_status IN ('scheduled','in_progress','completed','cancelled')),
    CONSTRAINT ck_maintenance_cost CHECK (cost >= 0),
    CONSTRAINT ck_maintenance_dates
        CHECK (completed_date IS NULL OR completed_date >= scheduled_date),
    CONSTRAINT fk_maintenance_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_maintenance_employee
        FOREIGN KEY (performed_by_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_maintenance_vehicle ON maintenance (vehicle_id);
CREATE INDEX idx_maintenance_status ON maintenance (maintenance_status, deleted_at);

-- =====================================================================
-- 11. ATTENDANCE
-- =====================================================================
CREATE TABLE attendance (
    attendance_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id          BIGINT UNSIGNED NOT NULL,
    attendance_date        DATE NOT NULL,
    check_in_time             DATETIME NULL,
    check_out_time              DATETIME NULL,
    attendance_status             VARCHAR(20) NOT NULL DEFAULT 'present',
    created_at                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                              ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT ck_attendance_status
        CHECK (attendance_status IN ('present','absent','half_day','on_leave','holiday')),
    CONSTRAINT ck_attendance_times
        CHECK (check_out_time IS NULL OR check_in_time IS NULL OR check_out_time >= check_in_time),
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_attendance_date ON attendance (attendance_date);

-- =====================================================================
-- 12. LEAVE  (leave_requests)
-- =====================================================================
CREATE TABLE leave_requests (
    leave_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id          BIGINT UNSIGNED NOT NULL,
    approved_by_id          BIGINT UNSIGNED NULL,       -- employee who approved
    leave_type                 VARCHAR(30) NOT NULL,
    start_date                    DATE NOT NULL,
    end_date                        DATE NOT NULL,
    reason                             VARCHAR(500) NULL,
    leave_status                        VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_leave_status
        CHECK (leave_status IN ('pending','approved','rejected','cancelled')),
    CONSTRAINT ck_leave_type
        CHECK (leave_type IN ('sick','casual','annual','unpaid','maternity','paternity','other')),
    CONSTRAINT ck_leave_dates CHECK (end_date >= start_date),
    CONSTRAINT fk_leave_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_leave_approver
        FOREIGN KEY (approved_by_id) REFERENCES employees(employee_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_leave_employee ON leave_requests (employee_id, leave_status);

-- =====================================================================
-- 13. INCIDENTS
-- =====================================================================
CREATE TABLE incidents (
    incident_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    incident_code        VARCHAR(30) NOT NULL,
    trip_id                  BIGINT UNSIGNED NULL,
    vehicle_id                  BIGINT UNSIGNED NULL,
    driver_id                      BIGINT UNSIGNED NULL,
    reported_by_id                    BIGINT UNSIGNED NOT NULL,  -- employee who filed report
    incident_date                        DATETIME NOT NULL,
    incident_type                           VARCHAR(50) NOT NULL,
    severity                                   VARCHAR(20) NOT NULL DEFAULT 'low',
    description                                   VARCHAR(1000) NULL,
    incident_status                                 VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at                                        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                                        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                                ON UPDATE CURRENT_TIMESTAMP,
    deleted_at                                        DATETIME NULL,
    CONSTRAINT uq_incidents_code UNIQUE (incident_code),
    CONSTRAINT ck_incidents_severity
        CHECK (severity IN ('low','medium','high','critical')),
    CONSTRAINT ck_incidents_status
        CHECK (incident_status IN ('open','under_review','resolved','closed')),
    CONSTRAINT fk_incidents_trip
        FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_driver
        FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_incidents_reporter
        FOREIGN KEY (reported_by_id) REFERENCES employees(employee_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_incidents_vehicle ON incidents (vehicle_id);
CREATE INDEX idx_incidents_driver ON incidents (driver_id);
CREATE INDEX idx_incidents_status ON incidents (incident_status, deleted_at);

-- =====================================================================
-- 14. VEHICLE ASSIGNMENTS  (which driver is/was assigned to which vehicle)
-- =====================================================================
CREATE TABLE vehicle_assignments (
    assignment_id      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id             BIGINT UNSIGNED NOT NULL,
    driver_id                 BIGINT UNSIGNED NOT NULL,
    assigned_date                DATE NOT NULL,
    unassigned_date                 DATE NULL,
    assignment_status                  VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                    ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT ck_vehicle_assignments_status
        CHECK (assignment_status IN ('active','ended')),
    CONSTRAINT ck_vehicle_assignments_dates
        CHECK (unassigned_date IS NULL OR unassigned_date >= assigned_date),
    CONSTRAINT fk_vehicle_assignments_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_assignments_driver
        FOREIGN KEY (driver_id) REFERENCES drivers(driver_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_vehicle_assignments_vehicle ON vehicle_assignments (vehicle_id, assignment_status);
CREATE INDEX idx_vehicle_assignments_driver ON vehicle_assignments (driver_id, assignment_status);

-- =====================================================================
-- 15. EMERGENCY CONTACTS
-- =====================================================================
CREATE TABLE emergency_contacts (
    emergency_contact_id  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id              BIGINT UNSIGNED NOT NULL,
    contact_name                VARCHAR(120) NOT NULL,
    relationship                   VARCHAR(50) NOT NULL,
    phone                             VARCHAR(20) NOT NULL,
    email                                VARCHAR(150) NULL,
    is_primary                             TINYINT(1) NOT NULL DEFAULT 0,
    created_at                                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_emergency_contacts_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_emergency_contacts_employee ON emergency_contacts (employee_id);

-- =====================================================================
-- 16. DOCUMENTS  (polymorphic-lite: belongs to an employee OR a vehicle)
-- =====================================================================
CREATE TABLE documents (
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

CREATE INDEX idx_documents_employee ON documents (employee_id);
CREATE INDEX idx_documents_vehicle ON documents (vehicle_id);
CREATE INDEX idx_documents_expiry ON documents (expiry_date);

-- =====================================================================
-- 17. AUDIT LOGS  (immutable change history; no soft delete/update)
-- =====================================================================
CREATE TABLE audit_logs (
    audit_log_id    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id        BIGINT UNSIGNED NULL,          -- actor; NULL for system actions
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

CREATE INDEX idx_audit_logs_table_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_employee ON audit_logs (employee_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);

-- =====================================================================
-- 18. NOTIFICATIONS
-- =====================================================================
CREATE TABLE notifications (
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

CREATE INDEX idx_notifications_employee ON notifications (employee_id, is_read);

-- =====================================================================
-- 19. SESSIONS  (auth/login sessions, tied to an employee)
-- =====================================================================
CREATE TABLE sessions (
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

CREATE INDEX idx_sessions_employee ON sessions (employee_id);
CREATE INDEX idx_sessions_expiry ON sessions (expires_at);

SET FOREIGN_KEY_CHECKS = 1;
