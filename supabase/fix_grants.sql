-- إصلاح: "permission denied for table courses"
-- إنشاء الجداول والسياسات ما يكفي وحده؛ لازم صلاحيات أساسية صريحة لأدوار anon/authenticated
-- نفّذي هذا الملف كامل في SQL Editor (مرة وحدة كافية)

grant usage on schema public to anon, authenticated;

grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;

grant select, update on public.profiles to authenticated;

grant select, insert, update, delete on public.gpa_records to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
