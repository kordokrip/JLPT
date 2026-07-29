-- Keep the spoken learning text separate from the visible question.  A
-- listening prompt asks about a dialogue; it is not itself the dialogue to
-- pronounce.  The column is optional so existing items can remain honestly
-- unavailable until their self-authored script has been supplied.
ALTER TABLE `topik_owner_authored_curriculum_items`
  ADD COLUMN `audio_text_ko` text;
