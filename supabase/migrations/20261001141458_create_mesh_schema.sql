/*
# Create Autonomous GitOps Self-Healing Mesh schema

Creates the full database schema for the infrastructure control panel.
This is a single-tenant app with no authentication — all policies allow
anon + authenticated access since the data is intentionally shared/public.

## New Tables

1. `clusters` — Kubernetes cluster definitions and current health
   - id (text, PK), name, provider, region, k8s version
   - current_version, desired_version — deployment versions
   - health (healthy/degraded/failing/pending)
   - created_at, updated_at

2. `nodes` — Worker/control-plane nodes within a cluster
   - id (text, PK), cluster_id (FK → clusters)
   - name, region, role (worker/control-plane)
   - cpu, memory (0-100 percent)
   - health
   - created_at, updated_at

3. `pods` — Individual pods running on nodes
   - id (text, PK), node_id (FK → nodes)
   - name, namespace, phase (Running/Pending/Failed/etc)
   - cpu, memory, latency, error_rate, restarts
   - age (text), health
   - created_at, updated_at

4. `deployments` — Deployment version history per cluster
   - id (text, PK), cluster_id (FK → clusters)
   - version, commit_hash, author, message
   - is_current (bool), rollback_count
   - health, deployed_at

5. `anomalies` — Detected anomaly events
   - id (uuid, PK), cluster_id, node_id, pod_name
   - rule (error-rate/latency/memory/cpu/restart)
   - severity (critical/warning/info)
   - metric, value, threshold, message
   - resolved (bool), triggered_rollback (bool)
   - created_at

6. `rollbacks` — Rollback simulation events
   - id (uuid, PK), cluster_name
   - from_version, to_version
   - triggered_by (manual/auto), anomaly_id
   - status (idle/preflight/executing/verifying/success/failed)
   - duration_seconds, steps (jsonb)
   - created_at

7. `mesh_logs` — Log entries from the simulation engine
   - id (uuid, PK)
   - severity (info/warning/error/success/debug)
   - source, message
   - created_at

8. `mesh_settings` — App configuration (single-tenant key-value)
   - id (int, PK, always 1)
   - config (jsonb — full settings object)
   - updated_at

## Security

- RLS enabled on every table.
- All policies use `TO anon, authenticated` because this is a no-auth app
  with intentionally shared/public data.
- 4 CRUD policies per table (select/insert/update/delete).

## Important Notes

1. Cascading deletes: deleting a cluster removes its nodes; deleting a node
   removes its pods. Deleting a cluster also removes its deployments.
2. Indexes on foreign keys and frequently-queried columns for performance.
3. `mesh_settings` uses a single-row pattern (id = 1) with a JSONB config
   column to store the full settings object.
*/

-- ===== Clusters =====

CREATE TABLE IF NOT EXISTS clusters (
  id text PRIMARY KEY,
  name text NOT NULL,
  provider text NOT NULL,
  region text NOT NULL,
  version text NOT NULL,
  current_version text NOT NULL,
  desired_version text NOT NULL,
  health text NOT NULL DEFAULT 'healthy',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clusters" ON clusters;
CREATE POLICY "anon_select_clusters" ON clusters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clusters" ON clusters;
CREATE POLICY "anon_insert_clusters" ON clusters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clusters" ON clusters;
CREATE POLICY "anon_update_clusters" ON clusters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clusters" ON clusters;
CREATE POLICY "anon_delete_clusters" ON clusters FOR DELETE
  TO anon, authenticated USING (true);

-- ===== Nodes =====

CREATE TABLE IF NOT EXISTS nodes (
  id text PRIMARY KEY,
  cluster_id text NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  name text NOT NULL,
  region text NOT NULL,
  role text NOT NULL DEFAULT 'worker',
  cpu numeric DEFAULT 0,
  memory numeric DEFAULT 0,
  health text NOT NULL DEFAULT 'healthy',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_nodes" ON nodes;
CREATE POLICY "anon_select_nodes" ON nodes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_nodes" ON nodes;
CREATE POLICY "anon_insert_nodes" ON nodes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_nodes" ON nodes;
CREATE POLICY "anon_update_nodes" ON nodes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_nodes" ON nodes;
CREATE POLICY "anon_delete_nodes" ON nodes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_nodes_cluster_id ON nodes(cluster_id);

-- ===== Pods =====

CREATE TABLE IF NOT EXISTS pods (
  id text PRIMARY KEY,
  node_id text NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  name text NOT NULL,
  namespace text NOT NULL,
  phase text NOT NULL DEFAULT 'Running',
  cpu numeric DEFAULT 0,
  memory numeric DEFAULT 0,
  latency numeric DEFAULT 0,
  error_rate numeric DEFAULT 0,
  restarts integer DEFAULT 0,
  age text DEFAULT '',
  health text NOT NULL DEFAULT 'healthy',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_pods" ON pods;
CREATE POLICY "anon_select_pods" ON pods FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_pods" ON pods;
CREATE POLICY "anon_insert_pods" ON pods FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_pods" ON pods;
CREATE POLICY "anon_update_pods" ON pods FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_pods" ON pods;
CREATE POLICY "anon_delete_pods" ON pods FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_pods_node_id ON pods(node_id);

-- ===== Deployments =====

CREATE TABLE IF NOT EXISTS deployments (
  id text PRIMARY KEY,
  cluster_id text NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  version text NOT NULL,
  commit_hash text NOT NULL,
  author text NOT NULL,
  message text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  rollback_count integer NOT NULL DEFAULT 0,
  health text NOT NULL DEFAULT 'healthy',
  deployed_at timestamptz DEFAULT now()
);

ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_deployments" ON deployments;
CREATE POLICY "anon_select_deployments" ON deployments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_deployments" ON deployments;
CREATE POLICY "anon_insert_deployments" ON deployments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_deployments" ON deployments;
CREATE POLICY "anon_update_deployments" ON deployments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_deployments" ON deployments;
CREATE POLICY "anon_delete_deployments" ON deployments FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_deployments_cluster_id ON deployments(cluster_id);

-- ===== Anomalies =====

CREATE TABLE IF NOT EXISTS anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id text REFERENCES clusters(id) ON DELETE CASCADE,
  node_id text,
  pod_name text NOT NULL,
  rule text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  metric text NOT NULL,
  value numeric NOT NULL,
  threshold numeric NOT NULL,
  message text NOT NULL,
  resolved boolean NOT NULL DEFAULT false,
  triggered_rollback boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_anomalies" ON anomalies;
CREATE POLICY "anon_select_anomalies" ON anomalies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_anomalies" ON anomalies;
CREATE POLICY "anon_insert_anomalies" ON anomalies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_anomalies" ON anomalies;
CREATE POLICY "anon_update_anomalies" ON anomalies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_anomalies" ON anomalies;
CREATE POLICY "anon_delete_anomalies" ON anomalies FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_anomalies_cluster_id ON anomalies(cluster_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolved ON anomalies(resolved);

-- ===== Rollbacks =====

CREATE TABLE IF NOT EXISTS rollbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_name text NOT NULL,
  from_version text NOT NULL,
  to_version text NOT NULL,
  triggered_by text NOT NULL DEFAULT 'manual',
  anomaly_id uuid,
  status text NOT NULL DEFAULT 'idle',
  duration_seconds integer DEFAULT 0,
  steps jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rollbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rollbacks" ON rollbacks;
CREATE POLICY "anon_select_rollbacks" ON rollbacks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rollbacks" ON rollbacks;
CREATE POLICY "anon_insert_rollbacks" ON rollbacks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rollbacks" ON rollbacks;
CREATE POLICY "anon_update_rollbacks" ON rollbacks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rollbacks" ON rollbacks;
CREATE POLICY "anon_delete_rollbacks" ON rollbacks FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_rollbacks_created_at ON rollbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rollbacks_cluster_name ON rollbacks(cluster_name);

-- ===== Mesh Logs =====

CREATE TABLE IF NOT EXISTS mesh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'info',
  source text NOT NULL DEFAULT 'system',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mesh_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mesh_logs" ON mesh_logs;
CREATE POLICY "anon_select_mesh_logs" ON mesh_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mesh_logs" ON mesh_logs;
CREATE POLICY "anon_insert_mesh_logs" ON mesh_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mesh_logs" ON mesh_logs;
CREATE POLICY "anon_update_mesh_logs" ON mesh_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mesh_logs" ON mesh_logs;
CREATE POLICY "anon_delete_mesh_logs" ON mesh_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_mesh_logs_created_at ON mesh_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mesh_logs_severity ON mesh_logs(severity);

-- ===== Mesh Settings (single-row key-value) =====

CREATE TABLE IF NOT EXISTS mesh_settings (
  id integer PRIMARY KEY DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE mesh_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mesh_settings" ON mesh_settings;
CREATE POLICY "anon_select_mesh_settings" ON mesh_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mesh_settings" ON mesh_settings;
CREATE POLICY "anon_insert_mesh_settings" ON mesh_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mesh_settings" ON mesh_settings;
CREATE POLICY "anon_update_mesh_settings" ON mesh_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mesh_settings" ON mesh_settings;
CREATE POLICY "anon_delete_mesh_settings" ON mesh_settings FOR DELETE
  TO anon, authenticated USING (true);
