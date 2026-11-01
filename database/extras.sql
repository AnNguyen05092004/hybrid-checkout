-- Parts of the schema DBML cannot express: partial and NULLS NOT DISTINCT indexes, triggers,
-- views for derived data, default settings. Appended to schema.sql by scripts/build_schema.sh.

-- ---------------------------------------------------------------- uniqueness rules

-- One open shift per counter and per cashier.
CREATE UNIQUE INDEX "ux_shifts_open_counter" ON "shifts" ("counter_id") WHERE closed_at IS NULL;
CREATE UNIQUE INDEX "ux_shifts_open_cashier" ON "shifts" ("cashier_id") WHERE closed_at IS NULL;

-- One transaction in progress per shift, so per counter.
CREATE UNIQUE INDEX "ux_transactions_open" ON "transactions" ("shift_id") WHERE status = 'OPEN';

-- An alert is identified by what it is about; re-running the reconciliation updates it in place.
-- Leading capture_id also serves the foreign key to tray_captures.
CREATE UNIQUE INDEX "ux_alerts_identity" ON "alerts" ("capture_id", "type", "seen_sku_id", "scanned_sku_id") NULLS NOT DISTINCT;

-- BR-07: only one model version runs at a time.
CREATE UNIQUE INDEX "ux_model_versions_active" ON "model_versions" ("status") WHERE status = 'ACTIVE';

-- One unfinished job of each type per batch.
CREATE UNIQUE INDEX "ux_jobs_running" ON "jobs" ("batch_id", "type") WHERE status IN ('QUEUED', 'RUNNING', 'EVALUATING');

-- Review queue of the store manager (BR-17).
CREATE INDEX "ix_alerts_to_review" ON "alerts" ("resolved_at") WHERE resolution = 'FALSE_ALARM' AND review_result IS NULL;

-- ---------------------------------------------------------------- triggers

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_users_updated_at" BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_categories_updated_at" BEFORE UPDATE ON "categories" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_counters_updated_at" BEFORE UPDATE ON "counters" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_skus_updated_at" BEFORE UPDATE ON "skus" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "trg_settings_updated_at" BEFORE UPDATE ON "settings" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- US27: the audit log cannot be edited or deleted. In production the app role also has no
-- UPDATE / DELETE grant on the table; the trigger covers the owner role.
CREATE FUNCTION reject_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END $$;

CREATE TRIGGER "trg_audit_logs_no_update" BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION reject_audit_change();
CREATE TRIGGER "trg_audit_logs_no_truncate" BEFORE TRUNCATE ON "audit_logs" FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_change();

-- BR-16: images of one transaction stay in one split, so validation never sees a tray it trained on.
CREATE FUNCTION check_split_per_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.split IS NOT NULL AND EXISTS (
    SELECT 1
    FROM label_tasks other
    JOIN tray_captures c_other ON c_other.id = other.capture_id
    JOIN tray_captures c_new ON c_new.id = NEW.capture_id
    WHERE c_other.transaction_id = c_new.transaction_id
      AND other.id <> NEW.id
      AND other.split IS NOT NULL
      AND other.split <> NEW.split
  ) THEN
    RAISE EXCEPTION 'BR-16: another image of this transaction is already in the other split (capture %)', NEW.capture_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "trg_label_tasks_split" BEFORE INSERT OR UPDATE OF split ON "label_tasks" FOR EACH ROW EXECUTE FUNCTION check_split_per_transaction();

-- ---------------------------------------------------------------- settings

CREATE FUNCTION setting_num(setting_key text) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT (value #>> '{}')::numeric FROM settings WHERE key = setting_key
$$;

INSERT INTO "settings" ("key", "value", "description") VALUES
  ('retention.transaction_days', '30', 'Days tray images of transactions are kept (BR-13)'),
  ('retention.batch_days', '14', 'Days sample photos and TRAIN real images of a batch are kept after deploy; VAL images stay (BR-13)'),
  ('gate.max_ap50_drop', '1', 'Max AP50 drop vs the running version, points (BR-09)'),
  ('gate.max_forgetting', '5', 'Max forgetting on earlier batches, points (BR-09)'),
  ('gate.min_miss_recall', '90', 'Min share of missed items caught, % (BR-09)'),
  ('gate.max_false_alarm', '10', 'Max share of clean trays alerted, % (BR-09)'),
  ('data.min_cutouts', '8', 'Accepted cutouts per new SKU before training (BR-11)'),
  ('data.min_val_images', '50', 'Real images in the validation set of a batch (BR-11)'),
  ('data.min_val_boxes', '20', 'Boxes per new SKU in the validation set (BR-11)'),
  ('audit.window_days', '30', 'Days of alerts used for the cashier statistics (BR-17)'),
  ('audit.high_value_vnd', '30000', 'False alarms worth at least this are reviewed first (BR-17)'),
  ('audit.anomaly_ratio', '1.5', 'Cashier false-alarm rate vs the store rate that flags the cashier (BR-17)'),
  ('audit.anomaly_min_alerts', '5', 'Alerts a cashier needs before the rate counts (BR-17)'),
  ('audit.random_sample_rate', '0.1', 'Share of the other false alarms sampled for review (BR-17)'),
  ('audit.anomaly_min_removals', '5', 'Deleted lines a cashier needs before the rate counts (BR-17)');

-- ---------------------------------------------------------------- derived data

-- Learn status of a SKU: LEARNED when the running version knows it, LEARNING while its batch is
-- in progress (also after a rollback), NOT_LEARNED when it is in no batch.
CREATE VIEW v_sku_learn_status AS
SELECT s.id AS sku_id,
       CASE WHEN mvs.sku_id IS NOT NULL THEN 'LEARNED'
            WHEN s.batch_id IS NOT NULL THEN 'LEARNING'
            ELSE 'NOT_LEARNED' END AS learn_status,
       mvs.class_index
FROM skus s
LEFT JOIN model_versions mv ON mv.status = 'ACTIVE'
LEFT JOIN model_version_skus mvs ON mvs.model_version_id = mv.id AND mvs.sku_id = s.id;

-- Data of each new SKU of a batch against the BR-11 targets (M08).
CREATE VIEW v_batch_sku_progress AS
SELECT s.batch_id, s.id AS sku_id,
       (SELECT count(*) FROM sku_samples x WHERE x.sku_id = s.id AND x.status = 'ACCEPTED') AS accepted_samples,
       (SELECT count(*) FROM annotations a JOIN label_tasks t ON t.id = a.label_task_id
         WHERE a.sku_id = s.id AND t.batch_id = s.batch_id AND t.split = 'VAL') AS val_boxes
FROM skus s
WHERE s.batch_id IS NOT NULL;

-- BR-11: may the batch be sent to training?
CREATE VIEW v_batch_readiness AS
SELECT b.id AS batch_id,
       count(p.sku_id) AS sku_count,
       count(p.sku_id) FILTER (WHERE p.accepted_samples >= setting_num('data.min_cutouts')) AS skus_with_samples,
       count(p.sku_id) FILTER (WHERE p.val_boxes >= setting_num('data.min_val_boxes')) AS skus_with_val_boxes,
       (SELECT count(*) FROM label_tasks t WHERE t.batch_id = b.id AND t.split = 'VAL') AS val_images,
       EXISTS (SELECT 1 FROM jobs j WHERE j.batch_id = b.id AND j.type = 'COMPOSITE' AND j.status = 'SUCCEEDED') AS has_composites
FROM import_batches b
LEFT JOIN v_batch_sku_progress p ON p.batch_id = b.id
GROUP BY b.id;

-- BR-17: false-alarm rate per cashier against the store, over HIGH and MEDIUM alerts.
CREATE VIEW v_cashier_alert_stats AS
WITH recent AS (
  SELECT sh.cashier_id, (al.resolution = 'FALSE_ALARM')::int AS false_alarm
  FROM alerts al
  JOIN tray_captures c ON c.id = al.capture_id
  JOIN transactions t ON t.id = c.transaction_id
  JOIN shifts sh ON sh.id = t.shift_id
  WHERE al.severity <> 'LOW'
    AND al.created_at >= now() - make_interval(days => setting_num('audit.window_days')::int)
), store AS (
  SELECT coalesce(avg(false_alarm), 0) AS rate FROM recent
)
SELECT r.cashier_id,
       count(*) AS alerts,
       sum(r.false_alarm) AS false_alarms,
       avg(r.false_alarm) AS rate,
       store.rate AS store_rate,
       count(*) >= setting_num('audit.anomaly_min_alerts')
         AND avg(r.false_alarm) > 0
         AND avg(r.false_alarm) >= store.rate * setting_num('audit.anomaly_ratio') AS is_anomalous
FROM recent r CROSS JOIN store
GROUP BY r.cashier_id, store.rate;

-- BR-05, BR-17: cashiers delete lines without a PIN, so deletions per transaction are compared with
-- the store the same way as false alarms. A flagged cashier has their deleted lines reviewed.
CREATE VIEW v_cashier_removal_stats AS
WITH recent AS (
  SELECT sh.cashier_id, t.id AS transaction_id, l.id AS line_id, l.qty * l.unit_price_vnd AS value_vnd
  FROM transactions t
  JOIN shifts sh ON sh.id = t.shift_id
  LEFT JOIN transaction_lines l ON l.transaction_id = t.id AND l.removed_at IS NOT NULL
  WHERE t.started_at >= now() - make_interval(days => setting_num('audit.window_days')::int)
), store AS (
  SELECT coalesce(count(line_id)::numeric / nullif(count(DISTINCT transaction_id), 0), 0) AS rate FROM recent
)
SELECT r.cashier_id,
       count(DISTINCT r.transaction_id) AS transactions,
       count(r.line_id) AS removed_lines,
       coalesce(sum(r.value_vnd), 0) AS removed_value_vnd,
       count(r.line_id)::numeric / count(DISTINCT r.transaction_id) AS rate,
       store.rate AS store_rate,
       count(r.line_id) >= setting_num('audit.anomaly_min_removals')
         AND count(r.line_id)::numeric / count(DISTINCT r.transaction_id) >= store.rate * setting_num('audit.anomaly_ratio') AS is_anomalous
FROM recent r CROSS JOIN store
GROUP BY r.cashier_id, store.rate;

-- BR-17: false alarms waiting for review and why each should be looked at first.
-- Order by priority DESC, value_vnd DESC. The random sample is stable: it hashes the alert id.
CREATE VIEW v_review_queue AS
WITH q AS (
  SELECT al.id AS alert_id, t.id AS transaction_id, sh.cashier_id, al.type, al.seen_sku_id, al.scanned_sku_id,
         al.value_vnd, al.reason, al.resolved_at,
         al.value_vnd >= setting_num('audit.high_value_vnd') AS high_value,
         coalesce(cs.is_anomalous, false) AS anomalous_cashier,
         abs(hashtext('audit-' || al.id)::bigint) % 1000 < setting_num('audit.random_sample_rate') * 1000 AS sampled
  FROM alerts al
  JOIN tray_captures c ON c.id = al.capture_id
  JOIN transactions t ON t.id = c.transaction_id
  JOIN shifts sh ON sh.id = t.shift_id
  LEFT JOIN v_cashier_alert_stats cs ON cs.cashier_id = sh.cashier_id
  WHERE al.resolution = 'FALSE_ALARM' AND al.review_result IS NULL
)
SELECT q.*,
       (sampled AND NOT high_value AND NOT anomalous_cashier) AS random_sample,
       high_value::int + anomalous_cashier::int + (sampled AND NOT high_value AND NOT anomalous_cashier)::int AS priority
FROM q;

-- BR-17: the same SKU pair closed as a false alarm by many cashiers points at the model, not at
-- the staff; L07 sends these trays to the hard-image queue.
CREATE VIEW v_false_alarm_pairs AS
SELECT al.seen_sku_id, al.scanned_sku_id,
       count(*) AS false_alarms,
       count(DISTINCT sh.cashier_id) AS cashiers,
       max(al.resolved_at) AS last_at
FROM alerts al
JOIN tray_captures c ON c.id = al.capture_id
JOIN transactions t ON t.id = c.transaction_id
JOIN shifts sh ON sh.id = t.shift_id
WHERE al.resolution = 'FALSE_ALARM'
  AND al.created_at >= now() - make_interval(days => setting_num('audit.window_days')::int)
GROUP BY al.seen_sku_id, al.scanned_sku_id;
