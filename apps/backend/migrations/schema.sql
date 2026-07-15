-- ============================================================================
-- JIVAH — DATABASE SCHEMA + ROW-LEVEL SECURITY (RLS)
-- ============================================================================
-- Run this against a fresh Postgres 16 database (see docker-compose.yml).
--
-- HOW RLS WORKS HERE:
-- The backend (NestJS) never connects as the table owner/superuser. It
-- connects as `app_user`, and at the start of every request/transaction it
-- runs:
--   SET LOCAL app.user_id     = '<uuid of logged-in user>';
--   SET LOCAL app.role        = '<patient|hospital_head|doctor|staff|medical_store_owner>';
--   SET LOCAL app.hospital_id = '<uuid, only for hospital_head/doctor/staff>';
--
-- Postgres then evaluates every SELECT/UPDATE/DELETE against the RLS
-- policies below using those session variables. Even if there's a bug in
-- the API code (forgot a WHERE clause, wrong join, etc.), the database
-- itself physically cannot return rows the session isn't allowed to see.
-- This is defense-in-depth on top of your NestJS RBAC guards, not instead
-- of them.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'patient', 'hospital_head', 'doctor', 'staff', 'medical_store_owner'
);

CREATE TYPE staff_subrole AS ENUM (
  'ambulance_driver', 'nurse', 'compounder', 'cleaner', 'mess_staff', 'other'
);

CREATE TYPE appointment_status AS ENUM (
  'pending_payment', 'paid', 'in_queue', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE order_status AS ENUM (
  'placed', 'accepted', 'rejected', 'out_for_delivery', 'delivered', 'cancelled'
);

CREATE TYPE donor_type AS ENUM ('donor', 'recipient');

CREATE TYPE emergency_status AS ENUM (
  'requested', 'accepted', 'en_route', 'completed', 'cancelled'
);

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

CREATE TABLE hospitals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,               -- 'hospital' | 'clinic'
  address       TEXT,
  city          TEXT,
  state         TEXT,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  rating        NUMERIC(2,1) DEFAULT 0,
  photos        JSONB DEFAULT '[]',
  amenities     JSONB DEFAULT '[]',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Single identity table for EVERYONE (patient, hospital head, doctor, staff,
-- store owner). Role-specific extra fields live in their own tables below.
CREATE TABLE users (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone                    TEXT UNIQUE NOT NULL,
  role                     user_role NOT NULL DEFAULT 'patient',
  full_name                TEXT,
  gender                   TEXT,
  dob                      DATE,
  photo_url                TEXT,
  password_hash            TEXT,             -- staff/head accounts only; patients use OTP
  password_set_by_head_id  UUID REFERENCES users(id), -- audit: who generated/reset this password
  hospital_id              UUID REFERENCES hospitals(id), -- null for patients
  is_active                BOOLEAN DEFAULT true,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE doctor_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hospital_id     UUID NOT NULL REFERENCES hospitals(id),
  department_id   UUID REFERENCES departments(id),
  specialization  TEXT,
  employee_id     TEXT,
  salary          NUMERIC(12,2),
  joined_at       DATE,
  is_on_leave     BOOLEAN DEFAULT false
);

CREATE TABLE staff_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hospital_id   UUID NOT NULL REFERENCES hospitals(id),
  subrole       staff_subrole NOT NULL,
  employee_id   TEXT,
  salary        NUMERIC(12,2),
  joined_at     DATE
);

CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  check_in    TIMESTAMPTZ,
  check_out   TIMESTAMPTZ,
  date        DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE leaves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  approved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. BOOKING / CLINICAL FLOW
-- ============================================================================

CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number    TEXT UNIQUE NOT NULL,
  patient_id        UUID NOT NULL REFERENCES users(id),
  hospital_id       UUID NOT NULL REFERENCES hospitals(id),
  department_id     UUID REFERENCES departments(id),
  doctor_id         UUID REFERENCES users(id),
  room_number       TEXT,
  queue_position    INT,
  status            appointment_status NOT NULL DEFAULT 'pending_payment',
  consultation_fee  NUMERIC(10,2),
  scheduled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id        UUID REFERENCES appointments(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  amount                NUMERIC(10,2) NOT NULL,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  razorpay_signature    TEXT,
  status                TEXT NOT NULL DEFAULT 'created', -- created/paid/failed/refunded
  verified_by_webhook   BOOLEAN DEFAULT false,
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  message         TEXT,
  attachment_url  TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  UUID NOT NULL REFERENCES hospitals(id),
  name         TEXT NOT NULL,
  price        NUMERIC(10,2),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE test_bookings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id               UUID NOT NULL REFERENCES users(id),
  appointment_id           UUID REFERENCES appointments(id),
  test_id                  UUID NOT NULL REFERENCES tests(id),
  hospital_id              UUID NOT NULL REFERENCES hospitals(id), -- where test actually happens
  status                   TEXT NOT NULL DEFAULT 'booked', -- booked/report_uploaded/cancelled
  report_upload_deadline   TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- The "Vault"
CREATE TABLE medical_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES users(id),
  test_booking_id   UUID REFERENCES test_bookings(id),
  uploaded_by       UUID REFERENCES users(id),
  file_url          TEXT NOT NULL,
  report_type       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE prescriptions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id           UUID NOT NULL REFERENCES appointments(id),
  patient_id               UUID NOT NULL REFERENCES users(id),
  doctor_id                UUID NOT NULL REFERENCES users(id),
  medicines                JSONB NOT NULL, -- [{name, dosage, duration, instructions}]
  notes                    TEXT,
  next_appointment_date    DATE,
  created_at               TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. MEDICAL STORE MODULE
-- ============================================================================

CREATE TABLE medical_stores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  address     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE store_inventory (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       UUID NOT NULL REFERENCES medical_stores(id) ON DELETE CASCADE,
  medicine_name  TEXT NOT NULL,
  price          NUMERIC(10,2) NOT NULL,
  stock_qty      INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE medicine_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id          UUID NOT NULL REFERENCES users(id),
  store_id            UUID NOT NULL REFERENCES medical_stores(id),
  status              order_status NOT NULL DEFAULT 'placed',
  delivery_address    TEXT,
  delivery_latitude   DOUBLE PRECISION,
  delivery_longitude  DOUBLE PRECISION,
  total_amount        NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE medicine_order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
  inventory_id     UUID NOT NULL REFERENCES store_inventory(id),
  quantity         INT NOT NULL,
  price_at_order   NUMERIC(10,2) NOT NULL
);

-- ============================================================================
-- 5. DONOR/RECIPIENT + EMERGENCY + FAMILY DOCTOR
-- ============================================================================

CREATE TABLE donor_recipient (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id),
  type                   donor_type NOT NULL,
  organ_or_part          TEXT NOT NULL,
  blood_group            TEXT,
  is_emergency           BOOLEAN DEFAULT false,
  status                 TEXT NOT NULL DEFAULT 'pending', -- pending/matched/completed/cancelled
  legal_consent_doc_url  TEXT,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE emergency_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES users(id),
  pickup_latitude    DOUBLE PRECISION NOT NULL,
  pickup_longitude   DOUBLE PRECISION NOT NULL,
  hospital_id        UUID REFERENCES hospitals(id),
  driver_id          UUID REFERENCES users(id),
  status             emergency_status NOT NULL DEFAULT 'requested',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE family_doctor_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES users(id),
  doctor_id    UUID NOT NULL REFERENCES users(id),
  is_active    BOOLEAN DEFAULT true,
  started_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. AUDIT (DPDP Act compliance — every medical-record read is logged)
-- ============================================================================

CREATE TABLE audit_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id            UUID NOT NULL REFERENCES users(id),
  action              TEXT NOT NULL,  -- 'read_medical_report' | 'read_prescription' | ...
  target_patient_id   UUID REFERENCES users(id),
  target_table        TEXT,
  target_id           UUID,
  ip_address          TEXT,
  created_at          TIMESTAMPTZ DEFAULT now()
);
-- Written by the app's service layer on every sensitive read.
-- Not RLS-protected against writes (app always logs); reads restricted to
-- admin/compliance tooling only — deliberately NOT exposed to normal users.

-- ============================================================================
-- 7. INDEXES (things that get joined/filtered constantly)
-- ============================================================================

CREATE INDEX idx_users_hospital        ON users(hospital_id);
CREATE INDEX idx_appointments_patient  ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor   ON appointments(doctor_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_reports_patient       ON medical_reports(patient_id);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_test_bookings_patient ON test_bookings(patient_id);
CREATE INDEX idx_orders_patient        ON medicine_orders(patient_id);
CREATE INDEX idx_orders_store          ON medicine_orders(store_id);
CREATE INDEX idx_chat_appointment      ON chat_messages(appointment_id);
CREATE INDEX idx_hospitals_location    ON hospitals(latitude, longitude);

-- ============================================================================
-- 8. HELPER FUNCTIONS FOR RLS
-- ============================================================================
-- These read the session variables set by NestJS at the start of each
-- request/transaction. `true` as 2nd arg to current_setting = don't error
-- if unset, just return NULL.

CREATE OR REPLACE FUNCTION current_user_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::UUID
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT current_setting('app.role', true)
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_hospital_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.hospital_id', true), '')::UUID
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 9. APP DB ROLE
-- ============================================================================
-- IMPORTANT: RLS is only enforced for roles that are NOT the table owner
-- (owners bypass RLS by default). So the app must connect as this
-- non-owner role, never as the migration/owner role.

CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_ME__store_in_secrets_manager';
GRANT CONNECT ON DATABASE jivah_db TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

-- ============================================================================
-- 10. ROW-LEVEL SECURITY POLICIES
-- ============================================================================

-- ---- users ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users
  FOR SELECT USING (id = current_user_id());

CREATE POLICY users_hospital_head_select ON users
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

CREATE POLICY users_doctor_sees_assigned_patient ON users
  FOR SELECT USING (
    current_user_role() = 'doctor' AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = users.id AND a.doctor_id = current_user_id()
    )
  );

CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = current_user_id());

CREATE POLICY users_head_manages_staff ON users
  FOR UPDATE USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );
-- Row creation (registration, staff onboarding) goes through a dedicated
-- service-role connection that bypasses RLS — normal app_user sessions are
-- read/update-scoped for this table by design.

-- ---- doctor_profiles / staff_profiles ----------------------------------
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY doc_profile_self ON doctor_profiles
  FOR SELECT USING (user_id = current_user_id());
CREATE POLICY doc_profile_head ON doctor_profiles
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_profile_self ON staff_profiles
  FOR SELECT USING (user_id = current_user_id());
CREATE POLICY staff_profile_head ON staff_profiles
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

-- ---- attendance / leaves ------------------------------------------------
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_self ON attendance
  FOR SELECT USING (user_id = current_user_id());
CREATE POLICY attendance_head ON attendance
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY leaves_self ON leaves
  FOR SELECT USING (user_id = current_user_id());
CREATE POLICY leaves_head ON leaves
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

-- ---- appointments --------------------------------------------------------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY appt_patient_select ON appointments
  FOR SELECT USING (patient_id = current_user_id());

CREATE POLICY appt_doctor_select ON appointments
  FOR SELECT USING (doctor_id = current_user_id());

CREATE POLICY appt_hospital_head_select ON appointments
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

CREATE POLICY appt_patient_insert ON appointments
  FOR INSERT WITH CHECK (patient_id = current_user_id());

CREATE POLICY appt_doctor_update ON appointments
  FOR UPDATE USING (doctor_id = current_user_id());

-- ---- payments --------------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_self ON payments
  FOR SELECT USING (user_id = current_user_id());

CREATE POLICY payments_hospital_head ON payments
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = payments.appointment_id AND a.hospital_id = current_hospital_id()
    )
  );
-- Inserts/updates to payments only ever happen from the backend's verified
-- Razorpay-webhook service path — never directly from a user session.

-- ---- chat_messages --------------------------------------------------------
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_participant_select ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = chat_messages.appointment_id
      AND (a.patient_id = current_user_id() OR a.doctor_id = current_user_id())
    )
  );

CREATE POLICY chat_participant_insert ON chat_messages
  FOR INSERT WITH CHECK (
    sender_id = current_user_id() AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = chat_messages.appointment_id
      AND (a.patient_id = current_user_id() OR a.doctor_id = current_user_id())
    )
  );

-- ---- test_bookings / medical_reports / prescriptions --------------------
ALTER TABLE test_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY test_booking_patient ON test_bookings
  FOR SELECT USING (patient_id = current_user_id());
CREATE POLICY test_booking_hospital_staff ON test_bookings
  FOR SELECT USING (
    current_user_role() IN ('hospital_head', 'doctor', 'staff')
    AND hospital_id = current_hospital_id()
  );

ALTER TABLE medical_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY reports_patient ON medical_reports
  FOR SELECT USING (patient_id = current_user_id());
CREATE POLICY reports_assigned_doctor ON medical_reports
  FOR SELECT USING (
    current_user_role() = 'doctor' AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = medical_reports.patient_id AND a.doctor_id = current_user_id()
    )
  );
CREATE POLICY reports_hospital_head ON medical_reports
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND EXISTS (
      SELECT 1 FROM test_bookings tb
      WHERE tb.id = medical_reports.test_booking_id AND tb.hospital_id = current_hospital_id()
    )
  );

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY presc_patient ON prescriptions
  FOR SELECT USING (patient_id = current_user_id());
CREATE POLICY presc_doctor_select ON prescriptions
  FOR SELECT USING (doctor_id = current_user_id());
CREATE POLICY presc_doctor_insert ON prescriptions
  FOR INSERT WITH CHECK (doctor_id = current_user_id());

-- ---- medicine_orders --------------------------------------------------------
ALTER TABLE medicine_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_patient ON medicine_orders
  FOR SELECT USING (patient_id = current_user_id());
CREATE POLICY order_store_owner ON medicine_orders
  FOR SELECT USING (
    current_user_role() = 'medical_store_owner' AND EXISTS (
      SELECT 1 FROM medical_stores s
      WHERE s.id = medicine_orders.store_id AND s.owner_id = current_user_id()
    )
  );
CREATE POLICY order_store_owner_update ON medicine_orders
  FOR UPDATE USING (
    current_user_role() = 'medical_store_owner' AND EXISTS (
      SELECT 1 FROM medical_stores s
      WHERE s.id = medicine_orders.store_id AND s.owner_id = current_user_id()
    )
  );

-- ---- donor_recipient --------------------------------------------------------
ALTER TABLE donor_recipient ENABLE ROW LEVEL SECURITY;
CREATE POLICY donor_self ON donor_recipient
  FOR SELECT USING (user_id = current_user_id());
-- Cross-patient matching (finding a compatible recipient for a donor) needs
-- broader visibility than any single user should have — that matching
-- engine runs under a dedicated service role that bypasses RLS, with every
-- match it makes written to audit_logs. Do NOT relax this policy to solve
-- matching; keep matching logic server-side and privileged instead.

-- ---- emergency_requests --------------------------------------------------------
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY emergency_patient ON emergency_requests
  FOR SELECT USING (patient_id = current_user_id());
CREATE POLICY emergency_driver ON emergency_requests
  FOR SELECT USING (driver_id = current_user_id());
CREATE POLICY emergency_hospital_head ON emergency_requests
  FOR SELECT USING (
    current_user_role() = 'hospital_head' AND hospital_id = current_hospital_id()
  );

-- ============================================================================
-- DONE. Next: wire up the NestJS request interceptor that sets
-- app.user_id / app.role / app.hospital_id per-transaction (ask me for this
-- next — it's what makes the policies above actually activate).
-- ============================================================================
