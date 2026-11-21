-- إصلاح: خطأ "infinite recursion" في سياسة جدول profiles
-- نفّذي هذا الملف كامل في SQL Editor (مرة وحدة كافية)

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "courses_admin_write" on public.courses;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "courses_admin_write"
  on public.courses for all
  using (public.is_admin())
  with check (public.is_admin());
