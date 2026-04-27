-- Nutrition tables: grant public read access
-- Los datos de tablas nutricionales son públicos (recetas de productos).
-- No necesitan restricción de RLS para lectura.

grant select on nutrition_tables   to anon, authenticated;
grant select on nutrition_lines    to anon, authenticated;
grant select on nutrition_weeks    to anon, authenticated;
grant select on nutrition_products to anon, authenticated;

drop policy if exists "nutrition_tables: read own or official" on nutrition_tables;
create policy "nutrition_tables: read" on nutrition_tables
  for select using (true);

drop policy if exists "nutrition_lines: read" on nutrition_lines;
create policy "nutrition_lines: read" on nutrition_lines
  for select using (true);

drop policy if exists "nutrition_weeks: read" on nutrition_weeks;
create policy "nutrition_weeks: read" on nutrition_weeks
  for select using (true);

drop policy if exists "nutrition_products: read" on nutrition_products;
create policy "nutrition_products: read" on nutrition_products
  for select using (true);
