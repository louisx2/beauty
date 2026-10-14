-- Cumpleaños de las clientas (opcional): para recordarlo en Hoy y felicitarla por WhatsApp.
-- Se guarda como fecha. Si la clienta no dice el año, el panel lo guarda con el año 1904 (bisiesto, así cabe el
-- 29 de febrero) y no muestra la edad. Sin esta columna el panel guarda lo demás de la ficha y avisa.
alter table public.clients add column if not exists birthday date;

comment on column public.clients.birthday is
  'Cumpleaños (opcional). Año 1904 = no se sabe el año.';
