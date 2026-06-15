BEGIN;
INSERT INTO public.services (id, name, category, description, duration, price, active) VALUES
  ('33333333-0003-0003-0003-000000000001', 'Toxina Botulínica - Líneas de expresión', 'medicina', '', 30, 12000, true),
  ('33333333-0003-0003-0003-000000000002', 'Toxina Botulínica - Hiperhidrosis axilar', 'medicina', '', 30, 15000, true),
  ('33333333-0003-0003-0003-000000000003', 'Toxina Botulínica - Bruxismo', 'medicina', '', 30, 12000, true),
  ('33333333-0003-0003-0003-000000000004', 'Toxina Botulínica - Cuello', 'medicina', '', 30, 15000, true),
  ('33333333-0003-0003-0003-000000000005', 'Relleno Ácido Hialurónico - Labios', 'medicina', '', 45, 15000, true),
  ('33333333-0003-0003-0003-000000000006', 'Relleno Ácido Hialurónico - Nariz', 'medicina', '', 45, 15000, true),
  ('33333333-0003-0003-0003-000000000007', 'Relleno Ácido Hialurónico - Mentón', 'medicina', '', 45, 10000, true),
  ('33333333-0003-0003-0003-000000000008', 'Relleno Ácido Hialurónico - Marcación mandibular', 'medicina', '', 60, 15000, true),
  ('33333333-0003-0003-0003-000000000009', 'Relleno Ácido Hialurónico - Pómulos y surcos', 'medicina', '', 45, 15000, true),
  ('33333333-0003-0003-0003-000000000010', 'Relleno Ácido Hialurónico - Ojeras', 'medicina', '', 45, 10000, true),
  ('33333333-0003-0003-0003-000000000011', 'Bioestimulador - Sculptra', 'medicina', '', 60, 25000, true),
  ('33333333-0003-0003-0003-000000000012', 'Bioestimulador - Radiesse', 'medicina', '', 60, 28000, true),
  ('33333333-0003-0003-0003-000000000013', 'Bioestimulador - Profhilo', 'medicina', '', 45, 20000, true),
  ('33333333-0003-0003-0003-000000000014', 'Bioestimulador - Hilos PDO (x10)', 'medicina', '', 60, 12000, true),
  ('33333333-0003-0003-0003-000000000015', 'Bioestimulador - Hilos tensores (desde)', 'medicina', '', 60, 20000, true),
  ('33333333-0003-0003-0003-000000000016', 'Mesoterapia NCTF - Ojeras', 'medicina', '', 30, 5000, true),
  ('33333333-0003-0003-0003-000000000017', 'Mesoterapia PDRN de Salmón - Ojeras', 'medicina', '', 30, 8000, true),
  ('33333333-0003-0003-0003-000000000018', 'Escleroterapia - Ampolla 2ml', 'medicina', '', 30, 3500, true),
  ('33333333-0003-0003-0003-000000000019', 'Eliminación de Verrugas (desde)', 'medicina', '', 20, 1000, true),
  ('33333333-0003-0003-0003-000000000020', 'HIFU Facial', 'medicina', '', 60, 0, true),
  ('33333333-0003-0003-0003-000000000021', 'HIFU Corporal', 'medicina', '', 75, 0, true),
  ('33333333-0003-0003-0003-000000000022', 'HIFU Vaginal', 'medicina', '', 45, 0, true),
  ('33333333-0003-0003-0003-000000000023', 'Radiofrecuencia', 'medicina', '', 45, 0, true)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, duration=EXCLUDED.duration, price=EXCLUDED.price, active=true;
COMMIT;
