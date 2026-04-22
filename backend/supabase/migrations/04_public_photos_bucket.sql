-- Hacer el bucket plant-photos publico para que getPublicUrl() funcione.
-- Los paths incluyen userId/plantId, no son adivinables.
update storage.buckets
set public = true
where id = 'plant-photos';
