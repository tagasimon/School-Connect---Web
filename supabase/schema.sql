-- ============================================================
-- SchoolConnect Database Schema
-- Multi-tenant: every table with school_id is isolated via RLS
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('super_admin', 'school_admin', 'teacher', 'accountant', 'parent');
create type subscription_status as enum ('trial', 'active', 'inactive');
create type attendance_status as enum ('present', 'absent');
create type sms_status as enum ('pending', 'sent', 'failed');
create type announcement_target as enum ('school', 'class', 'parent', 'teacher');
create type contract_status as enum ('draft', 'active', 'expired', 'cancelled');

-- ============================================================
-- SCHOOLS (tenant root)
-- ============================================================
create table schools (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  address         text,
  phone           text,
  email           text,
  subscription_status subscription_status not null default 'trial',
  subscription_plan   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- SALES REPS  (Elastic Technologies sales personnel)
-- ============================================================
create table sales_reps (
  id              uuid primary key default uuid_generate_v4(),
  full_name       text not null,
  email           text,
  phone           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- SCHOOL CONTRACTS  (one per school: subscription billing)
-- ============================================================
create table school_contracts (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade unique,
  agreed_amount   numeric(12,2) not null check (agreed_amount >= 0),
  status          contract_status not null default 'draft',
  contract_person_name    text,        -- contact person at the school
  contract_person_phone   text,
  contract_person_email   text,
  contract_person_role    text,        -- e.g. "Headteacher", "Bursar"
  sales_rep_id    uuid references sales_reps(id) on delete set null,
  start_date      date,
  end_date        date,
  notes           text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CONTRACT PAYMENTS  (manual payment entries from schools)
-- ============================================================
create table contract_payments (
  id              uuid primary key default uuid_generate_v4(),
  contract_id     uuid not null references school_contracts(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  payment_date    date not null default current_date,
  reference       text,                     -- receipt/reference number
  notes           text,
  recorded_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);

create index idx_contract_payments_contract on contract_payments (contract_id);
create index idx_contract_payments_school on contract_payments (school_id);
create index idx_contract_payments_date    on contract_payments (payment_date desc);

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  full_name       text not null,
  phone           text,
  role            user_role not null,
  school_id       uuid references schools(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'parent')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TERMS
-- ============================================================
create table terms (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  name            text not null,            -- e.g. "Term 1"
  year            int  not null,
  start_date      date not null,
  end_date        date not null,
  is_current      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Only one current term per school
create unique index one_current_term_per_school
  on terms (school_id) where (is_current = true);

-- ============================================================
-- CLASSES
-- ============================================================
create table classes (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  term_id         uuid not null references terms(id) on delete cascade,
  name            text not null,            -- e.g. "P1A"
  teacher_id      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SUBJECTS
-- ============================================================
create table subjects (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- COMMITMENT TYPES  (school-defined extra fee services)
-- ============================================================
create table commitment_types (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  name            text not null,                -- e.g. "School Lunch", "Transport"
  default_amount  numeric(12,2) not null default 0 check (default_amount >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- STUDENT COMMITMENTS  (per-student extra fees)
-- ============================================================
create table student_commitments (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  commitment_type_id uuid references commitment_types(id) on delete set null,
  name            text not null,                -- denormalised from commitment_types
  amount          numeric(12,2) not null check (amount >= 0),
  created_at      timestamptz not null default now()
);

create index idx_student_commitments_student on student_commitments (student_id);
create index idx_student_commitments_school on student_commitments (school_id);

-- ============================================================
-- STUDENTS
-- ============================================================
create table students (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete restrict,
  full_name       text not null,
  student_number  text,
  date_of_birth   date,
  gender          text check (gender in ('male', 'female', 'other')),
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index students_number_per_school
  on students (school_id, student_number) where student_number is not null;

-- ============================================================
-- PARENT ↔ STUDENT  (many-to-many)
-- ============================================================
create table parent_student (
  id              uuid primary key default uuid_generate_v4(),
  parent_id       uuid not null references profiles(id) on delete cascade,
  student_id      uuid not null references students(id) on delete cascade,
  relationship    text,
  is_primary      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (parent_id, student_id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================
create table attendance (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  date            date not null,
  status          attendance_status not null default 'absent',
  marked_by       uuid not null references profiles(id),
  notes           text,
  sms_sent        boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (student_id, date)
);

-- ============================================================
-- RESULTS
-- ============================================================
create table results (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  subject_id      uuid not null references subjects(id) on delete cascade,
  term_id         uuid not null references terms(id) on delete cascade,
  marks_obtained  numeric(5,1) not null check (marks_obtained >= 0),
  marks_total     numeric(5,1) not null check (marks_total > 0),
  grade           text,
  remarks         text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, subject_id, term_id)
);

-- ============================================================
-- FEE STRUCTURES  (set by school admin: fee per class per term)
-- ============================================================
create table fee_structures (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  term_id         uuid not null references terms(id) on delete cascade,
  amount          numeric(12,2) not null check (amount >= 0),
  payment_deadline date,                     -- date after which unpaid fees are overdue
  notes           text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (school_id, class_id, term_id)
);

-- ============================================================
-- FEES
-- ============================================================
create table fees (
  id              uuid primary key default uuid_generate_v4(),
  student_id      uuid not null references students(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  term_id         uuid not null references terms(id) on delete cascade,
  total_amount    numeric(12,2) not null check (total_amount >= 0),
  amount_paid     numeric(12,2) not null default 0 check (amount_paid >= 0),
  notes           text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (student_id, term_id)
);

-- Computed balance as generated column
alter table fees add column balance numeric(12,2)
  generated always as (total_amount - amount_paid) stored;

-- ============================================================
-- PAYMENTS  (individual payment records with receipt numbers)
-- ============================================================
create table payments (
  id              uuid primary key default uuid_generate_v4(),
  fee_id          uuid not null references fees(id) on delete cascade,
  student_id      uuid not null references students(id) on delete cascade,
  school_id       uuid not null references schools(id) on delete cascade,
  amount          numeric(12,2) not null check (amount > 0),
  receipt_number  text not null,
  payment_date    date not null default current_date,
  notes           text,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

create index idx_payments_fee       on payments (fee_id);
create index idx_payments_student   on payments (student_id);
create index idx_payments_school    on payments (school_id, created_at desc);
create unique index idx_payments_receipt_per_school
  on payments (school_id, receipt_number);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table announcements (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  class_id        uuid references classes(id) on delete cascade,  -- null = school-wide
  title           text not null,
  body            text not null,
  target          announcement_target not null default 'school',
  sms_sent        boolean not null default false,
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- SMS LOGS
-- ============================================================
create table sms_logs (
  id              uuid primary key default uuid_generate_v4(),
  school_id       uuid not null references schools(id) on delete cascade,
  to_phone        text not null,
  message         text not null,
  status          sms_status not null default 'pending',
  provider_ref    text,
  error           text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger schools_updated_at    before update on schools    for each row execute procedure set_updated_at();
create trigger sales_reps_updated_at before update on sales_reps for each row execute procedure set_updated_at();
create trigger school_contracts_updated_at before update on school_contracts for each row execute procedure set_updated_at();
create trigger profiles_updated_at   before update on profiles   for each row execute procedure set_updated_at();
create trigger students_updated_at   before update on students   for each row execute procedure set_updated_at();
create trigger results_updated_at    before update on results    for each row execute procedure set_updated_at();
create trigger fees_updated_at       before update on fees       for each row execute procedure set_updated_at();
create trigger fee_structures_updated_at before update on fee_structures for each row execute procedure set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table schools         enable row level security;
alter table sales_reps      enable row level security;
alter table school_contracts enable row level security;
alter table contract_payments enable row level security;
alter table profiles        enable row level security;
alter table terms           enable row level security;
alter table classes         enable row level security;
alter table subjects        enable row level security;
alter table students        enable row level security;
alter table parent_student  enable row level security;
alter table attendance      enable row level security;
alter table results         enable row level security;
alter table fee_structures  enable row level security;
alter table fees            enable row level security;
alter table payments        enable row level security;
alter table commitment_types enable row level security;
alter table student_commitments enable row level security;
alter table announcements   enable row level security;
alter table sms_logs        enable row level security;

-- Helper: current user's profile
create or replace function current_profile()
returns profiles language sql security definer stable as $$
  select * from profiles where id = auth.uid()
$$;

-- SCHOOLS
create policy "super_admin_all_schools" on schools
  for all using ((current_profile()).role = 'super_admin');

create policy "school_members_read_own_school" on schools
  for select using (id = (current_profile()).school_id);

-- SALES REPS (super_admin only)
create policy "super_admin_manage_sales_reps" on sales_reps
  for all using ((current_profile()).role = 'super_admin');

create policy "super_admin_read_sales_reps" on sales_reps
  for select using ((current_profile()).role = 'super_admin');

-- SCHOOL CONTRACTS (super_admin full access, school_admin read own)
create policy "super_admin_manage_contracts" on school_contracts
  for all using ((current_profile()).role = 'super_admin');

create policy "school_admin_read_own_contract" on school_contracts
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role = 'school_admin'
  );

-- CONTRACT PAYMENTS (super_admin full access)
create policy "super_admin_manage_contract_payments" on contract_payments
  for all using ((current_profile()).role = 'super_admin');

create policy "school_admin_read_own_contract_payments" on contract_payments
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role = 'school_admin'
  );

-- PROFILES
create policy "users_read_own_profile" on profiles
  for select using (id = auth.uid());

create policy "school_admin_read_school_profiles" on profiles
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "super_admin_all_profiles" on profiles
  for all using ((current_profile()).role = 'super_admin');

-- TERMS
create policy "school_members_read_terms" on terms
  for select using (school_id = (current_profile()).school_id);

create policy "school_admin_manage_terms" on terms
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

-- CLASSES
create policy "school_members_read_classes" on classes
  for select using (school_id = (current_profile()).school_id);

create policy "school_admin_manage_classes" on classes
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

-- STUDENTS
create policy "school_members_read_students" on students
  for select using (school_id = (current_profile()).school_id);

create policy "school_admin_manage_students" on students
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "parent_read_own_children" on students
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = students.id
      and ps.parent_id = auth.uid()
    )
  );

-- PARENT_STUDENT
create policy "parent_read_own_links" on parent_student
  for select using (parent_id = auth.uid());

create policy "school_admin_manage_parent_links" on parent_student
  for all using (
    exists (
      select 1 from students s
      where s.id = parent_student.student_id
      and s.school_id = (current_profile()).school_id
    )
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

-- ATTENDANCE
create policy "teacher_manage_own_attendance" on attendance
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('teacher', 'school_admin', 'super_admin')
  );

create policy "parent_read_child_attendance" on attendance
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = attendance.student_id
      and ps.parent_id = auth.uid()
    )
  );

-- RESULTS
create policy "school_staff_manage_results" on results
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('teacher', 'school_admin', 'super_admin')
  );

create policy "parent_read_child_results" on results
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = results.student_id
      and ps.parent_id = auth.uid()
    )
  );

-- FEES
create policy "accountant_manage_fees" on fees
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('accountant', 'school_admin', 'super_admin')
  );

create policy "parent_read_child_fees" on fees
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = fees.student_id
      and ps.parent_id = auth.uid()
    )
  );

-- FEE STRUCTURES
create policy "school_admin_manage_fee_structures" on fee_structures
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "accountant_read_fee_structures" on fee_structures
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('accountant', 'school_admin', 'super_admin')
  );

-- PAYMENTS
create policy "accountant_manage_payments" on payments
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('accountant', 'school_admin', 'super_admin')
  );

create policy "parent_read_child_payments" on payments
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = payments.student_id
      and ps.parent_id = auth.uid()
    )
  );

create policy "teacher_read_class_payments" on payments
  for select using (
    exists (
      select 1 from classes c
      join students s on s.class_id = c.id
      where s.id = payments.student_id
      and c.teacher_id = auth.uid()
    )
  );

-- COMMITMENT TYPES
create policy "school_admin_manage_commitment_types" on commitment_types
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "accountant_read_commitment_types" on commitment_types
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('accountant', 'school_admin', 'super_admin')
  );

-- STUDENT COMMITMENTS
create policy "school_admin_manage_student_commitments" on student_commitments
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "accountant_read_student_commitments" on student_commitments
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('accountant', 'school_admin', 'super_admin')
  );

create policy "parent_read_own_child_commitments" on student_commitments
  for select using (
    exists (
      select 1 from parent_student ps
      where ps.student_id = student_commitments.student_id
      and ps.parent_id = auth.uid()
    )
  );

-- ANNOUNCEMENTS
create policy "school_staff_manage_announcements" on announcements
  for all using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('teacher', 'school_admin', 'super_admin')
  );

create policy "parent_read_school_announcements" on announcements
  for select using (
    school_id in (
      select s.school_id from students s
      join parent_student ps on ps.student_id = s.id
      where ps.parent_id = auth.uid()
    )
  );

-- SMS LOGS (staff only)
create policy "school_admin_read_sms_logs" on sms_logs
  for select using (
    school_id = (current_profile()).school_id
    and (current_profile()).role in ('school_admin', 'super_admin')
  );

create policy "service_insert_sms_logs" on sms_logs
  for insert with check (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_students_school       on students (school_id);
create index idx_students_class        on students (class_id);
create index idx_attendance_date       on attendance (school_id, date);
create index idx_attendance_student    on attendance (student_id, date);
create index idx_results_student       on results (student_id, term_id);
create index idx_fees_student          on fees (student_id, term_id);
create index idx_announcements_school  on announcements (school_id, created_at desc);
create index idx_parent_student_parent on parent_student (parent_id);
create index idx_sms_logs_school       on sms_logs (school_id, created_at desc);
