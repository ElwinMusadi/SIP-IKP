-- Production Schema Migration: 0003_initial_reporters_array.sql
-- Project: Sistem Informasi Pelaporan Insiden Keselamatan Pasien (IKP) IBS RSUD Prof. Dr. W. Z. Johannes Kupang
-- Engine: Cloudflare D1 / SQLite STRICT Mode
--
-- Purpose: Add initial_reporters JSON TEXT column to store an ordered array of reporters.
-- Each element: { name: string, category: string, detail?: string }
-- The existing scalar columns initial_reporter_category / initial_reporter_detail are RETAINED
-- as legacy consumer aliases, kept synchronised to first array row by application logic.
--
-- Rollout risk: ADDITIVE ONLY. No column dropped. No backfill performed.
-- Legacy records will return a synthesised single-element array at read time (application layer).
-- Apply after local validation and before deploying code that selects this column.
-- Rollback application code without dropping the column; legacy scalars remain available.

PRAGMA foreign_keys = ON;

ALTER TABLE incident_reports ADD COLUMN initial_reporters TEXT;
