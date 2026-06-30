CREATE OR REPLACE FUNCTION tiempo_produccion_promedio(dias INTEGER)
RETURNS TABLE(ruta TEXT, horas_promedio NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(p.ruta, 'N/A'),
         AVG(EXTRACT(EPOCH FROM (last_move.created_at - first_move.created_at)) / 3600)::NUMERIC(10,1)
  FROM pedidos p
  JOIN LATERAL (
    SELECT created_at FROM pedido_movimientos
    WHERE pedido_id = p.id ORDER BY created_at ASC LIMIT 1
  ) first_move ON true
  JOIN LATERAL (
    SELECT created_at FROM pedido_movimientos
    WHERE pedido_id = p.id AND to_area = 'entregado'
    ORDER BY created_at DESC LIMIT 1
  ) last_move ON true
  WHERE p.estado = 'entregado'
    AND p.created_at >= NOW() - (dias || ' days')::INTERVAL
  GROUP BY p.ruta
  ORDER BY horas_promedio;
END;
$$ LANGUAGE plpgsql;
