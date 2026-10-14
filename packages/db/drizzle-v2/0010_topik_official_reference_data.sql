-- Official TOPIK reference data is intentionally separate from self-authored learning items.
-- It stores the public exam blueprint and aggregate applicant statistics only.

CREATE TABLE `topik_exam_blueprints` (
  `id` text PRIMARY KEY NOT NULL,
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `exam_level` text NOT NULL,
  `delivery_mode` text NOT NULL,
  `section` text NOT NULL,
  `question_count` integer NOT NULL CHECK (`question_count` > 0),
  `section_score` integer NOT NULL CHECK (`section_score` > 0),
  `total_score` integer NOT NULL CHECK (`total_score` > 0),
  `grade_min` integer NOT NULL CHECK (`grade_min` >= 1),
  `grade_max` integer NOT NULL CHECK (`grade_max` >= `grade_min`),
  `source_code` text NOT NULL,
  `source_url` text NOT NULL,
  `source_version` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  UNIQUE (`learning_track`,`exam_level`,`delivery_mode`,`section`),
  FOREIGN KEY (`learning_track`,`source_code`)
    REFERENCES `track_content_sources`(`learning_track`,`source_code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `topik_exam_blueprint_level_idx`
  ON `topik_exam_blueprints` (`learning_track`,`exam_level`,`delivery_mode`);
--> statement-breakpoint

CREATE TABLE `topik_official_statistics` (
  `learning_track` text NOT NULL CHECK (`learning_track` = 'topik-ko'),
  `source_code` text NOT NULL,
  `country_name_ko` text NOT NULL,
  `exam_level` text NOT NULL,
  `age_band` text NOT NULL,
  `applicant_count` integer NOT NULL CHECK (`applicant_count` >= 0),
  `source_row` integer NOT NULL CHECK (`source_row` > 0),
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL,
  PRIMARY KEY (`learning_track`,`source_code`,`country_name_ko`,`exam_level`,`age_band`),
  FOREIGN KEY (`learning_track`,`source_code`)
    REFERENCES `track_content_sources`(`learning_track`,`source_code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `topik_official_statistics_level_idx`
  ON `topik_official_statistics` (`learning_track`,`source_code`,`exam_level`,`age_band`);
