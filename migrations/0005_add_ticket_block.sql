-- Some festivals sell tickets per screening block rather than per film, so the
-- ticket link lands on a page where the buyer still has to pick the right block
-- themselves (FilmFreeway, for one, offers no way to preselect it in the URL).
-- When this is set, "Get tickets" shows a confirmation step naming the block
-- before handing the visitor off. Nullable: rows without it link straight out.
ALTER TABLE screenings ADD COLUMN ticket_block TEXT;
