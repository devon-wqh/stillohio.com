-- Price shown alongside the block on the pre-handoff notice, so buyers know what
-- to expect before landing on a ticket page listing every block at once. Free
-- text rather than a number: festivals quote these differently ("$15", "$15 + fees",
-- "Free"), and this is display copy, not something we do arithmetic on.
ALTER TABLE screenings ADD COLUMN ticket_price TEXT;
