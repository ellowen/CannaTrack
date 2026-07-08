-- Agrega columna xp_awarded a scheduled_tasks: rastrea si una tarea ya
-- otorgo XP alguna vez, para que no se pueda re-farmear completando/
-- deshaciendo la misma tarea desde otro dispositivo o tras borrar datos
-- locales. Antes esto solo vivia en localStorage.

ALTER TABLE scheduled_tasks
  ADD COLUMN IF NOT EXISTS xp_awarded boolean NOT NULL DEFAULT false;
