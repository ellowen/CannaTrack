-- ============================================================
-- FIX: plants.available_products -- NULL significa "usar todos los productos de la tabla"
-- (migracion 09). El cliente guardaba `[]` cuando la planta no habia filtrado nada y la
-- columna tenia DEFAULT '{}', y al recargar el motor leia `[]` como "ningun producto":
-- cualquier regeneracion del calendario (iniciar floracion, editar la duracion, las fechas...)
-- dejaba las tareas de nutricion SIN productos.
--
-- Datos viejos: todo `{}` se interpreta como "todos" (el cliente nunca distinguio los dos casos al
-- guardar). Desde ahora `[]` solo se guarda si el usuario deselecciona todos los productos a
-- proposito, y "todos" se guarda como NULL.
-- ============================================================

ALTER TABLE plants ALTER COLUMN available_products DROP DEFAULT;

UPDATE plants SET available_products = NULL WHERE available_products = '{}'::text[];
