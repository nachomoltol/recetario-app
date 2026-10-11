-- ==============================================================================
-- SEMILLA DE DATOS (SEED): Catálogo Maestro Inicial de Ingredientes
-- ==============================================================================

INSERT INTO public.ingredientes_maestro 
(nombre, nombre_normalizado, categoria, calorias_por_100g, proteinas_por_100g, carbohidratos_por_100g, grasas_por_100g, fibra_por_100g, sodio_mg_por_100g, densidad_g_ml, peso_unidad_promedio_g, es_ultraprocesado, alergenos)
VALUES
-- Grasas y Aceites (Densidad ~0.92 g/ml)
('Aceite de oliva virgen extra', 'aceite de oliva virgen extra', 'grasas_aceites', 884.00, 0.00, 0.00, 100.00, 0.00, 2.00, 0.918, NULL, false, '{}'),
('Mantequilla sin sal', 'mantequilla sin sal', 'grasas_aceites', 717.00, 0.85, 0.06, 81.11, 0.00, 11.00, 0.911, NULL, false, '{"lactosa"}'),

-- Proteínas animales y huevos
('Pechuga de pollo (cruda)', 'pechuga de pollo cruda', 'carnes', 165.00, 31.02, 0.00, 3.57, 0.00, 74.00, 1.050, 150.00, false, '{}'),
('Huevo de gallina entero', 'huevo de gallina entero', 'huevos', 143.00, 12.56, 0.72, 9.51, 0.00, 142.00, 1.030, 55.00, false, '{"huevo"}'),
('Salmón fresco', 'salmon fresco', 'pescados', 208.00, 20.42, 0.00, 13.42, 0.00, 59.00, 1.020, 180.00, false, '{"pescado"}'),
('Lomo de ternera magro', 'lomo de ternera magro', 'carnes', 180.00, 26.50, 0.00, 8.20, 0.00, 65.00, 1.050, 200.00, false, '{}'),

-- Cereales y Harinas (Densidad ~0.53 - 0.60 g/ml)
('Harina de trigo de todo uso', 'harina de trigo de todo uso', 'cereales', 364.00, 10.33, 76.31, 0.98, 2.70, 2.00, 0.528, NULL, false, '{"gluten"}'),
('Avena integral en copos', 'avena integral en copos', 'cereales', 389.00, 16.89, 66.27, 6.90, 10.60, 2.00, 0.450, NULL, false, '{"gluten"}'),
('Arroz blanco de grano redondo', 'arroz blanco de grano redondo', 'cereales', 365.00, 7.13, 79.95, 0.66, 1.30, 1.00, 0.850, NULL, false, '{}'),

-- Lácteos (Densidad ~1.03 g/ml)
('Leche entera de vaca', 'leche entera de vaca', 'lacteos', 61.00, 3.15, 4.80, 3.25, 0.00, 43.00, 1.032, NULL, false, '{"lactosa"}'),
('Yogur griego natural (sin azúcar)', 'yogur griego natural sin azucar', 'lacteos', 97.00, 9.00, 3.60, 5.00, 0.00, 36.00, 1.050, 125.00, false, '{"lactosa"}'),
('Queso parmesano reggiano', 'queso parmesano reggiano', 'lacteos', 431.00, 38.46, 4.06, 28.61, 0.00, 1529.00, 0.600, NULL, false, '{"lactosa"}'),

-- Frutas y Verduras
('Tomate pera maduro', 'tomate pera maduro', 'verduras', 18.00, 0.88, 3.92, 0.20, 1.20, 5.00, 0.950, 90.00, false, '{}'),
('Cebolla dulce', 'cebolla dulce', 'verduras', 40.00, 1.10, 9.34, 0.10, 1.70, 4.00, 0.900, 130.00, false, '{}'),
('Diente de ajo', 'diente de ajo', 'verduras', 149.00, 6.36, 33.06, 0.50, 2.10, 17.00, 0.980, 5.00, false, '{}'),
('Espinacas frescas', 'espinacas frescas', 'verduras', 23.00, 2.86, 3.63, 0.39, 2.20, 79.00, 0.350, NULL, false, '{}'),
('Plátano de Canarias', 'platano de canarias', 'frutas', 89.00, 1.09, 22.84, 0.33, 2.60, 1.00, 0.950, 120.00, false, '{}'),

-- Endulzantes y Condimentos
('Miel pura de abejas', 'miel pura de abejas', 'endulzantes', 304.00, 0.30, 82.40, 0.00, 0.20, 4.00, 1.420, NULL, false, '{}'),
('Azúcar blanco refinado', 'azucar blanco refinado', 'endulzantes', 387.00, 0.00, 99.98, 0.00, 0.00, 1.00, 0.850, NULL, true, '{}'),
('Sal marina fina', 'sal marina fina', 'condimentos', 0.00, 0.00, 0.00, 0.00, 0.00, 38758.00, 1.280, NULL, false, '{}')
ON CONFLICT (nombre) DO NOTHING;
