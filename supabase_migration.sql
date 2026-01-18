-- Add new columns to the commercial_demands table
ALTER TABLE commercial_demands
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS salesperson_name TEXT,
ADD COLUMN IF NOT EXISTS project_code TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT;

-- Optional: Add comments to columns
COMMENT ON COLUMN commercial_demands.client_name IS 'Nome do cliente ou da obra principal';
COMMENT ON COLUMN commercial_demands.project_name IS 'Identificação secundária da obra ou projeto';
COMMENT ON COLUMN commercial_demands.salesperson_name IS 'Nome do vendedor ou consultor responsável';
COMMENT ON COLUMN commercial_demands.project_code IS 'Código interno da obra';
COMMENT ON COLUMN commercial_demands.observations IS 'Observações gerais, notas e comentários';
