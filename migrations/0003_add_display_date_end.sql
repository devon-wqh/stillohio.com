-- Optional end label for a screening whose date is a range or window rather than
-- a single known day (e.g. "September 11, 2026" – "September 18, 2026"). When set,
-- the public tiles and screening page render "display_date – display_date_end".
ALTER TABLE screenings ADD COLUMN display_date_end TEXT;
