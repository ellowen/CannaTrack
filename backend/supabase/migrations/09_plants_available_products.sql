-- Migration 09: Add available_products column to plants table
-- Available products array for custom product selection per plant
-- null = use all products from the nutrition table
-- array of strings = only these products are available for this plant

alter table plants add column if not exists available_products text[] default null;

-- Add comment for documentation
comment on column plants.available_products is 'Array of product names available for this plant. null = use all products from nutrition table.';
