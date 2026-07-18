-- FTS remains hand-written because Drizzle does not model SQLite virtual
-- tables or their synchronization triggers. Regular tables are owned by
-- schema.ts and 0000_schema_convergence.sql.

CREATE VIRTUAL TABLE IF NOT EXISTS `vocab_fts` USING fts5(
  ja, kana, ko,
  content='vocab',
  content_rowid='id'
);

CREATE VIRTUAL TABLE IF NOT EXISTS `sentences_fts` USING fts5(
  ja, ko,
  content='sentences',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS `vocab_fts_ai`
AFTER INSERT ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(rowid, ja, kana, ko)
  VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;

CREATE TRIGGER IF NOT EXISTS `vocab_fts_ad`
AFTER DELETE ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(`vocab_fts`, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
END;

CREATE TRIGGER IF NOT EXISTS `vocab_fts_au`
AFTER UPDATE ON `vocab`
BEGIN
  INSERT INTO `vocab_fts`(`vocab_fts`, rowid, ja, kana, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.kana, OLD.ko);
  INSERT INTO `vocab_fts`(rowid, ja, kana, ko)
  VALUES (NEW.id, NEW.ja, NEW.kana, NEW.ko);
END;

CREATE TRIGGER IF NOT EXISTS `sentences_fts_ai`
AFTER INSERT ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(rowid, ja, ko)
  VALUES (NEW.id, NEW.ja, NEW.ko);
END;

CREATE TRIGGER IF NOT EXISTS `sentences_fts_ad`
AFTER DELETE ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(`sentences_fts`, rowid, ja, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.ko);
END;

CREATE TRIGGER IF NOT EXISTS `sentences_fts_au`
AFTER UPDATE ON `sentences`
BEGIN
  INSERT INTO `sentences_fts`(`sentences_fts`, rowid, ja, ko)
  VALUES ('delete', OLD.id, OLD.ja, OLD.ko);
  INSERT INTO `sentences_fts`(rowid, ja, ko)
  VALUES (NEW.id, NEW.ja, NEW.ko);
END;
