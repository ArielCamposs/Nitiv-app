-- 1. Create User Roles Enum
create type user_role as enum ('student', 'teacher', 'professional', 'admin', 'superadmin');

-- 2. Create Institutions Table
create table institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz default now()
);

-- 3. Create Profiles Table (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references institutions(id),
  role user_role not null default 'student',
  full_name text,
  avatar_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Enable RLS
alter table institutions enable row level security;
alter table profiles enable row level security;

-- 5. Policies
create policy "Institutions are viewable by authenticated users."
  on institutions for select
  to authenticated
  using (true);

create policy "Users can view their own profile."
  on profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can view profiles in their institution."
  on profiles for select
  to authenticated
  using (
    institution_id = (select institution_id from profiles where id = auth.uid())
  );

-- 6. Mood Logs Table
create table mood_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade not null,
  institution_id uuid references institutions(id) not null,
  score int not null check (score >= 1 and score <= 5),
  tags text[] default '{}',
  note text,
  created_at timestamptz default now()
);

alter table mood_logs enable row level security;

create policy "Students can insert their own mood logs."
  on mood_logs for insert
  to authenticated
  with check (student_id = auth.uid());

create policy "Students can view their own mood logs."
  on mood_logs for select
  to authenticated
  using (student_id = auth.uid());

create policy "Staff can view mood logs of their institution."
  on mood_logs for select
  to authenticated
  using (
    institution_id = (select institution_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) in ('teacher', 'professional', 'admin')
  );

-- 7. Courses Table
create table courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references institutions(id),
  name text not null,
  grade text,
  slug text,
  created_at timestamptz default now()
);

-- 8. Enrollments
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  student_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- 9. Alerts Table
create table alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  type text check (type in ('mood', 'academic', 'attendance')),
  priority text check (priority in ('low', 'medium', 'high')),
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 10. Cases Table (Professional)
create table cases (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id),
  professional_id uuid references profiles(id),
  title text,
  status text default 'active',
  summary text,
  created_at timestamptz default now()
);

-- Enable RLS for new tables
alter table courses enable row level security;
alter table enrollments enable row level security;
alter table alerts enable row level security;
alter table cases enable row level security;

-- Simple policies for demo (Staff access)
create policy "Staff view courses" on courses for select to authenticated using (true);
create policy "Staff view enrollments" on enrollments for select to authenticated using (true);
create policy "Staff view alerts" on alerts for select to authenticated using (true);
create policy "Staff view cases" on cases for select to authenticated using (true);

-- 11. Missions Table
create table missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  points_reward int default 10,
  icon text,
  created_at timestamptz default now()
);

-- 12. Student Missions Progress
create table student_missions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  mission_id uuid references missions(id) on delete cascade,
  status text check (status in ('pending', 'completed')) default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- RLS for Missions
alter table missions enable row level security;
alter table student_missions enable row level security;

create policy "Read missions" on missions for select to authenticated using (true);
create policy "Student manage own missions" on student_missions for all to authenticated using (student_id = auth.uid());

-- 13. Teacher-Course Assignments
create table teacher_courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(teacher_id, course_id)
);

-- 14. Student Observations
create table observations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade not null,
  teacher_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id),
  title text not null,
  content text not null,
  category text check (category in ('academic', 'behavioral', 'social', 'other')) default 'other',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 15. School Activities
create table school_activities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id),
  title text not null,
  description text,
  activity_date date not null,
  activity_type text check (activity_type in ('assignment', 'exam', 'event', 'project', 'other')) default 'other',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 16. Psychologist Reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade not null,
  professional_id uuid references profiles(id) on delete cascade not null,
  course_id uuid references courses(id),
  title text not null,
  summary text,
  content text,
  priority text check (priority in ('low', 'medium', 'high')) default 'low',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 17. Teacher Resources
create table resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  content text,
  category text check (category in ('protocol', 'guide', 'advice', 'tool', 'other')) default 'other',
  file_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table teacher_courses enable row level security;
alter table observations enable row level security;
alter table school_activities enable row level security;
alter table reports enable row level security;
alter table resources enable row level security;

-- RLS Policies for teacher_courses
create policy "Teachers view their course assignments"
  on teacher_courses for select
  to authenticated
  using (teacher_id = auth.uid() or (select role from profiles where id = auth.uid()) in ('admin', 'superadmin'));

create policy "Admins manage teacher courses"
  on teacher_courses for all
  to authenticated
  using ((select role from profiles where id = auth.uid()) in ('admin', 'superadmin'));

-- RLS Policies for observations
create policy "Teachers create observations"
  on observations for insert
  to authenticated
  with check (
    teacher_id = auth.uid() and
    exists (
      select 1 from enrollments e
      join teacher_courses tc on e.course_id = tc.course_id
      where e.student_id = observations.student_id
      and tc.teacher_id = auth.uid()
    )
  );

create policy "Teachers view their observations"
  on observations for select
  to authenticated
  using (
    teacher_id = auth.uid() or
    (select role from profiles where id = auth.uid()) in ('professional', 'admin', 'superadmin')
  );

create policy "Teachers update their observations"
  on observations for update
  to authenticated
  using (teacher_id = auth.uid());

create policy "Teachers delete their observations"
  on observations for delete
  to authenticated
  using (teacher_id = auth.uid());

-- RLS Policies for school_activities
create policy "Teachers create activities"
  on school_activities for insert
  to authenticated
  with check (teacher_id = auth.uid());

create policy "Teachers view activities for their courses"
  on school_activities for select
  to authenticated
  using (
    exists (
      select 1 from teacher_courses tc
      where tc.course_id = school_activities.course_id
      and tc.teacher_id = auth.uid()
    ) or
    (select role from profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

create policy "Teachers update their activities"
  on school_activities for update
  to authenticated
  using (teacher_id = auth.uid());

create policy "Teachers delete their activities"
  on school_activities for delete
  to authenticated
  using (teacher_id = auth.uid());

-- RLS Policies for reports
create policy "Professionals create reports"
  on reports for insert
  to authenticated
  with check (
    professional_id = auth.uid() and
    (select role from profiles where id = auth.uid()) = 'professional'
  );

create policy "Teachers view reports for their students"
  on reports for select
  to authenticated
  using (
    exists (
      select 1 from enrollments e
      join teacher_courses tc on e.course_id = tc.course_id
      where e.student_id = reports.student_id
      and tc.teacher_id = auth.uid()
    ) or
    professional_id = auth.uid() or
    (select role from profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

create policy "Professionals update their reports"
  on reports for update
  to authenticated
  using (professional_id = auth.uid());

create policy "Professionals delete their reports"
  on reports for delete
  to authenticated
  using (professional_id = auth.uid());

-- RLS Policies for resources
create policy "Anyone can view resources"
  on resources for select
  to authenticated
  using (true);

create policy "Admins manage resources"
  on resources for all
  to authenticated
  using ((select role from profiles where id = auth.uid()) in ('admin', 'superadmin'));

-- 18. Appointments/Sessions Table
create table appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references profiles(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  appointment_date timestamptz not null,
  duration_minutes int default 60,
  status text check (status in ('scheduled', 'completed', 'cancelled')) default 'scheduled',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for appointments
alter table appointments enable row level security;

-- RLS Policies for appointments
create policy "Professionals create appointments"
  on appointments for insert
  to authenticated
  with check (
    professional_id = auth.uid() and
    (select role from profiles where id = auth.uid()) = 'professional'
  );

create policy "Professionals view their appointments"
  on appointments for select
  to authenticated
  using (
    professional_id = auth.uid() or
    student_id = auth.uid() or
    (select role from profiles where id = auth.uid()) in ('admin', 'superadmin')
  );

create policy "Professionals update their appointments"
  on appointments for update
  to authenticated
  using (professional_id = auth.uid());

create policy "Professionals delete their appointments"
  on appointments for delete
  to authenticated
  using (professional_id = auth.uid());
