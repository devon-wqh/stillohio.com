-- Event title shown as the headline on tiles and the screening page. It can be a
-- festival name, a city, or a distinguishing label like "GenreBlast Screening 1"
-- when a town has multiple screenings. Nullable: rows without a title fall back
-- to the town as the heading.
ALTER TABLE screenings ADD COLUMN title TEXT;
