alter table public.notification_preferences
  add column if not exists push_time_local time without time zone not null default '08:00:00';
