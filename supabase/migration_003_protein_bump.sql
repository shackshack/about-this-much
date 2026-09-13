-- Run this once in Supabase SQL Editor as a new snippet.
-- Bumps the protein target from the bare RDA minimum (46/56) to a more realistic
-- general-health target (60/75), matching the updated app defaults. Only updates
-- accounts that never touched their protein target from the old default — if someone
-- already customized theirs, this leaves it alone.

alter table profiles alter column protein_target_g set default 60;

update profiles set protein_target_g = 60 where target_group = 'women' and protein_target_g = 46;
update profiles set protein_target_g = 75 where target_group = 'men' and protein_target_g = 56;
