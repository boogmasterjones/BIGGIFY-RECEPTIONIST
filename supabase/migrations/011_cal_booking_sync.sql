-- 011: Cal.com booking sync — store cal_booking_id so dashboard appts sync back to Cal.com
-- Adds cal_booking_id column to appointments table to enable two-way sync

alter table public.appointments
add column cal_booking_id text;

create index if not exists appointments_cal_booking_idx on public.appointments(cal_booking_id);
