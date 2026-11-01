-- Smoke test of schema.sql: one valid checkout and batch, then rows the rules must reject.
-- Run by scripts/check_schema.sh on an empty database; everything is rolled back at the end.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
BEGIN;

-- The statement must fail, and for the expected reason (constraint name or message part).
CREATE FUNCTION pg_temp.must_fail(label text, expected text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  err text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    err := SQLERRM;
  END;
  IF err IS NULL THEN RAISE EXCEPTION 'NOT REJECTED: %', label; END IF;
  IF strpos(err, expected) = 0 THEN RAISE EXCEPTION 'REJECTED FOR ANOTHER REASON: % -- %', label, err; END IF;
  RAISE NOTICE 'rejected: % (%)', label, expected;
END $$;

CREATE FUNCTION pg_temp.must_be(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'WRONG: %', label; END IF;
  RAISE NOTICE 'as expected: %', label;
END $$;

-- People, counter, catalog
INSERT INTO users (id, email, full_name, role, password_hash, pin_hash) OVERRIDING SYSTEM VALUE VALUES
  (1, 'ha@hybrid.local', 'Nguyễn Thu Hà', 'CASHIER', 'x', NULL),
  (2, 'khoa@hybrid.local', 'Trần Minh Khoa', 'CASHIER', 'x', NULL),
  (3, 'bao@hybrid.local', 'Lê Quốc Bảo', 'STORE_MANAGER', 'x', 'pin-hash'),
  (4, 'an@hybrid.local', 'Phạm Gia An', 'ML_ENGINEER', 'x', NULL);
INSERT INTO counters (id, code, name, camera_name, camera_url) OVERRIDING SYSTEM VALUE VALUES (1, 'Q1', 'Quầy 1', 'CAM-Q1', 'http://camera-q1.local/snapshot.jpg');
INSERT INTO categories (id, code, name) OVERRIDING SYSTEM VALUE VALUES (1, 'drink', 'Nước giải khát');
INSERT INTO import_batches (id, seq_no, name, status, created_by, deployed_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'Khai trương', 'DEPLOYED', 3, now()),
  (2, 2, 'Đợt nhập 2', 'COLLECTING', 3, NULL);
INSERT INTO skus (id, barcode, name, category_id, price_vnd, batch_id) OVERRIDING SYSTEM VALUE VALUES
  (11, '2000000000110', 'Nước 011', 1, 12000, 1),
  (12, '2000000000127', 'Nước 012', 1, 45000, 1),
  (21, '2000000000219', 'Nước 021', 1, 15000, 2);

-- Seed rows use fixed ids; move the identity sequences past them.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.columns WHERE column_name = 'id' AND is_identity = 'YES' LOOP
    EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, ''id''), 100)', t);
  END LOOP;
END $$;

-- Model v1 knows batch 1
INSERT INTO jobs (id, type, batch_id, status, progress, progress_total, created_by, started_at, finished_at) OVERRIDING SYSTEM VALUE VALUES
  (1, 'TRAIN', 1, 'SUCCEEDED', 16, 16, 4, now(), now());
INSERT INTO model_versions (id, code, name, batch_id, train_job_id, backbone, checkpoint_uri, status,
  ap50, cacc, forgetting, miss_recall, false_alarm_rate, swap_recall, gate_passed, gate_report) OVERRIDING SYSTEM VALUE VALUES
  (1, 'v1', 'v1 — Khai trương', 1, 1, 'backbone', 'checkpoints/v1', 'ACTIVE', 93.4, 79.4, 0, 95.1, 5.8, 71.0, true, '{}');
INSERT INTO model_version_skus VALUES (1, 11, 0), (1, 12, 1);
INSERT INTO model_deployments (action, model_version_id, performed_by) VALUES ('DEPLOY', 1, 4);
INSERT INTO threshold_configs (batch_id, low_threshold, alert_threshold, auto_threshold, created_by) VALUES (1, 0.3, 0.5, 0.8, 4);

-- A checkout: two items on the tray, one scanned, the cashier calls the alert a false alarm
INSERT INTO shifts (id, counter_id, cashier_id, opening_cash_vnd) OVERRIDING SYSTEM VALUE VALUES (1, 1, 1, 500000);
INSERT INTO transactions (id, code, shift_id, mode) OVERRIDING SYSTEM VALUE VALUES (1, 'GD1000', 1, 'VERIFY');
INSERT INTO transaction_lines (transaction_id, sku_id, qty, unit_price_vnd, source) VALUES (1, 11, 1, 12000, 'BARCODE');
INSERT INTO tray_captures (id, transaction_id, status, model_version_id, image_key, latency_ms) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'SUCCEEDED', 1, 'trays/1.jpg', 180);
INSERT INTO detections (id, capture_id, sku_id, score, box_x, box_y, box_w, box_h) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 11, 0.95, 0.1, 0.1, 0.2, 0.2),
  (2, 1, 12, 0.91, 0.5, 0.5, 0.2, 0.3);
INSERT INTO alerts (id, capture_id, type, severity, seen_sku_id, value_vnd) OVERRIDING SYSTEM VALUE VALUES
  (1, 1, 'UNSCANNED_ITEM', 'HIGH', 12, 45000);
INSERT INTO alert_detections (alert_id, detection_id, capture_id) VALUES (1, 2, 1);
UPDATE alerts SET resolution = 'FALSE_ALARM', reason = 'Model nhầm SKU', resolved_by = 1, resolved_at = now() WHERE id = 1;
UPDATE transactions SET status = 'PAID', total_vnd = 12000, payment_method = 'CASH', cash_received_vnd = 20000, closed_at = now() WHERE id = 1;
UPDATE shifts SET closed_at = now(), counted_cash_vnd = 512000 WHERE id = 1;

-- The tray goes to the labelling queue of batch 2
INSERT INTO tray_captures (id, transaction_id, status, error) OVERRIDING SYSTEM VALUE VALUES (2, 1, 'FAILED', 'Camera timeout');
INSERT INTO label_tasks (id, batch_id, capture_id, source, image_key, queued_by) OVERRIDING SYSTEM VALUE VALUES
  (1, 2, 1, 'HARD_IMAGE', 'datasets/2/1.jpg', 3);
UPDATE label_tasks SET status = 'LABELED', split = 'VAL', proposals_total = 2, proposals_accepted = 2, completed_by = 4, completed_at = now() WHERE id = 1;
INSERT INTO annotations (label_task_id, sku_id, box_x, box_y, box_w, box_h, origin, proposal_score, created_by) VALUES
  (1, 11, 0.1, 0.1, 0.2, 0.2, 'MODEL_PROPOSAL', 0.95, 4),
  (1, 21, 0.5, 0.5, 0.2, 0.3, 'MANUAL', NULL, 4);
INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, counter_id, detail) VALUES
  (1, 'FALSE_ALARM', 'transaction', 1, 1, '{"reason": "Model nhầm SKU"}');

-- A second checkout at the same counter: the cashier deletes a line without a PIN (BR-05)
INSERT INTO shifts (id, counter_id, cashier_id, opening_cash_vnd) OVERRIDING SYSTEM VALUE VALUES (2, 1, 2, 0);
INSERT INTO transactions (id, code, shift_id, mode) OVERRIDING SYSTEM VALUE VALUES (2, 'GD1001', 2, 'FAST');
INSERT INTO transaction_lines (transaction_id, sku_id, qty, unit_price_vnd, source, removed_at, removed_by, removal_reason) VALUES
  (2, 12, 1, 45000, 'BARCODE', now(), 2, 'CUSTOMER_DECLINED');
INSERT INTO tray_captures (id, transaction_id, status, model_version_id, image_key) OVERRIDING SYSTEM VALUE VALUES
  (3, 2, 'SUCCEEDED', 1, 'trays/3.jpg');
INSERT INTO detections (id, capture_id, sku_id, score, box_x, box_y, box_w, box_h) OVERRIDING SYSTEM VALUE VALUES
  (3, 3, 11, 0.6, 0.2, 0.2, 0.2, 0.2);

-- A queued job may be cancelled before it starts
INSERT INTO jobs (type, batch_id, status, progress_total, created_by, finished_at) VALUES ('COMPOSITE', 2, 'CANCELLED', 1000, 4, now());

-- Derived data
SELECT pg_temp.must_be('SKU of the running model is LEARNED',
  (SELECT learn_status FROM v_sku_learn_status WHERE sku_id = 11) = 'LEARNED');
SELECT pg_temp.must_be('SKU of the batch in progress is LEARNING',
  (SELECT learn_status FROM v_sku_learn_status WHERE sku_id = 21) = 'LEARNING');
SELECT pg_temp.must_be('false alarm of 45.000 ₫ is in the review queue as high value',
  (SELECT high_value FROM v_review_queue WHERE alert_id = 1));
SELECT pg_temp.must_be('batch 2 counts its validation image and box',
  (SELECT val_images = 1 AND skus_with_val_boxes = 0 AND NOT has_composites FROM v_batch_readiness WHERE batch_id = 2));
SELECT pg_temp.must_be('cashier statistics see the false alarm',
  (SELECT false_alarms = 1 FROM v_cashier_alert_stats WHERE cashier_id = 1));
SELECT pg_temp.must_be('cashier statistics see the deleted line',
  (SELECT removed_lines = 1 AND removed_value_vnd = 45000 AND NOT is_anomalous FROM v_cashier_removal_stats WHERE cashier_id = 2));
SELECT pg_temp.must_be('false-alarm pair is counted',
  (SELECT false_alarms = 1 AND cashiers = 1 FROM v_false_alarm_pairs WHERE seen_sku_id = 12));

-- Rules that must hold
SELECT pg_temp.must_fail('BR-07 a second ACTIVE version', 'ux_model_versions_active', $$
  INSERT INTO jobs (id, type, batch_id, status, progress, progress_total, created_by, started_at, finished_at) OVERRIDING SYSTEM VALUE
    VALUES (2, 'TRAIN', 2, 'SUCCEEDED', 16, 16, 4, now(), now());
  INSERT INTO model_versions (code, name, batch_id, train_job_id, backbone, checkpoint_uri, status,
    ap50, cacc, forgetting, miss_recall, false_alarm_rate, swap_recall, gate_passed, gate_report)
    VALUES ('v2', 'v2', 2, 2, 'b', 'c', 'ACTIVE', 1, 1, 0, 1, 1, 1, true, '{}') $$);
SELECT pg_temp.must_fail('two open shifts on one counter', 'ux_shifts_open_counter', $$
  INSERT INTO shifts (counter_id, cashier_id, opening_cash_vnd) VALUES (1, 1, 0), (1, 2, 0) $$);
SELECT pg_temp.must_fail('BR-04 false alarm without a reason', 'ck_alerts_false_alarm', $$
  INSERT INTO alerts (capture_id, type, severity, seen_sku_id, scanned_sku_id, resolution, resolved_by, resolved_at)
    VALUES (1, 'SUSPECTED_SWAP', 'HIGH', 12, 11, 'FALSE_ALARM', 1, now()) $$);
SELECT pg_temp.must_fail('BR-03 HIGH alert closed by itself', 'ck_alerts_resolution_by_severity', $$
  INSERT INTO alerts (capture_id, type, severity, seen_sku_id, resolution, resolved_at)
    VALUES (1, 'UNSCANNED_ITEM', 'HIGH', 11, 'AUTO_CLOSED', now()) $$);
SELECT pg_temp.must_fail('the same alert twice in one transaction', 'ux_alerts_identity', $$
  INSERT INTO alerts (capture_id, type, severity, seen_sku_id, value_vnd)
    VALUES (1, 'UNSCANNED_ITEM', 'HIGH', 12, 45000) $$);
SELECT pg_temp.must_fail('review of an alert that is not a false alarm', 'ck_alerts_review_false_alarm', $$
  INSERT INTO alerts (capture_id, type, severity, scanned_sku_id, resolution, resolved_at, review_result, reviewed_by, reviewed_at)
    VALUES (1, 'SCANNED_NOT_SEEN', 'LOW', 11, 'AUTO_CLOSED', now(), 'ALERT_CORRECT', 3, now()) $$);
SELECT pg_temp.must_fail('UC12 manager PIN of the cashier at the counter', 'ck_manager_approvals_other_person', $$
  INSERT INTO manager_approvals (transaction_id, action, manager_id, requested_by, reason) VALUES (1, 'CANCEL_TRANSACTION', 1, 1, 'x') $$);
SELECT pg_temp.must_fail('PIN for a cashier', 'ck_users_pin_manager_only', $$ UPDATE users SET pin_hash = 'x' WHERE id = 1 $$);
SELECT pg_temp.must_fail('BR-05 line removed without who and why', 'ck_transaction_lines_removal', $$
  UPDATE transaction_lines SET removed_at = now() WHERE transaction_id = 1 $$);
SELECT pg_temp.must_fail('camera line without its box', 'ck_transaction_lines_camera_source', $$
  INSERT INTO transaction_lines (transaction_id, sku_id, qty, unit_price_vnd, source) VALUES (1, 12, 1, 45000, 'CAMERA') $$);
SELECT pg_temp.must_fail('paid without a payment method', 'ck_transactions_paid', $$
  INSERT INTO transactions (code, shift_id, mode, status, total_vnd, closed_at) VALUES ('GD1001', 1, 'VERIFY', 'PAID', 1000, now()) $$);
SELECT pg_temp.must_fail('cash received below the total', 'ck_transactions_change', $$
  UPDATE transactions SET cash_received_vnd = 1000 WHERE id = 1 $$);
SELECT pg_temp.must_fail('box outside the image', 'ck_detections_box', $$
  INSERT INTO detections (capture_id, sku_id, score, box_x, box_y, box_w, box_h) VALUES (1, 11, 0.9, 0.9, 0.1, 0.2, 0.2) $$);
SELECT pg_temp.must_fail('thresholds out of order', 'ck_threshold_configs_order', $$
  INSERT INTO threshold_configs (batch_id, low_threshold, alert_threshold, auto_threshold, created_by) VALUES (1, 0.6, 0.5, 0.8, 4) $$);
SELECT pg_temp.must_fail('model proposal stored without its score', 'ck_annotations_origin', $$
  INSERT INTO annotations (label_task_id, sku_id, box_x, box_y, box_w, box_h, origin, created_by) VALUES (1, 12, 0, 0, 0.1, 0.1, 'MODEL_PROPOSAL', 4) $$);
SELECT pg_temp.must_fail('BR-16 one transaction in both splits', 'BR-16', $$
  INSERT INTO label_tasks (batch_id, capture_id, source, image_key, queued_by, status, split, completed_by, completed_at)
    VALUES (2, 2, 'HARD_IMAGE', 'datasets/2/2.jpg', 3, 'LABELED', 'TRAIN', 4, now()) $$);
SELECT pg_temp.must_fail('alert box taken from another tray check', 'detection_id_capture_id', $$
  INSERT INTO alert_detections (alert_id, detection_id, capture_id) VALUES (1, 3, 1) $$);
SELECT pg_temp.must_fail('version of another batch than its training job', 'train_job_id_batch_id', $$
  INSERT INTO jobs (id, type, batch_id, status, progress, progress_total, created_by, started_at, finished_at) OVERRIDING SYSTEM VALUE
    VALUES (3, 'TRAIN', 1, 'SUCCEEDED', 16, 16, 4, now(), now());
  INSERT INTO model_versions (code, name, batch_id, train_job_id, backbone, checkpoint_uri,
    ap50, cacc, forgetting, miss_recall, false_alarm_rate, swap_recall, gate_passed, gate_report)
    VALUES ('v2', 'v2', 2, 3, 'b', 'c', 1, 1, 0, 1, 1, 1, true, '{}') $$);
SELECT pg_temp.must_fail('LOW alert closed as scanned', 'ck_alerts_resolution_by_severity', $$
  INSERT INTO alerts (capture_id, type, severity, scanned_sku_id, resolution, resolved_by, resolved_at)
    VALUES (1, 'SCANNED_NOT_SEEN', 'LOW', 12, 'SCANNED', 1, now()) $$);
SELECT pg_temp.must_fail('rollback without the version it replaces', 'ck_model_deployments_rollback_from', $$
  INSERT INTO model_deployments (action, model_version_id, reason, performed_by) VALUES ('ROLLBACK', 1, 'Lỗi', 4) $$);
SELECT pg_temp.must_fail('rollback without a reason', 'ck_model_deployments_reason', $$
  INSERT INTO model_deployments (action, model_version_id, previous_version_id, performed_by) VALUES ('ROLLBACK', 1, NULL, 4) $$);
SELECT pg_temp.must_fail('US27 audit log edited', 'append-only', $$ UPDATE audit_logs SET action = 'X' $$);
SELECT pg_temp.must_fail('US27 audit log deleted', 'append-only', $$ DELETE FROM audit_logs $$);
SELECT pg_temp.must_fail('transaction with history deleted while its tray is in a dataset', 'label_tasks_capture_id_fkey', $$
  DELETE FROM transactions WHERE id = 1 $$);

\o
\echo 'schema test passed'
ROLLBACK;
