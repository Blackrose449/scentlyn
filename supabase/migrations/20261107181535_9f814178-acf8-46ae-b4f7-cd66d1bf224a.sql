CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_full_name text,
  p_phone text,
  p_email text,
  p_delivery_zone_id uuid,
  p_delivery_address_note text,
  p_payment_method text,
  p_mpesa_mode text,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_zone public.delivery_zones%ROWTYPE;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_subtotal numeric(12,2) := 0;
  v_delivery_fee numeric(12,2);
  v_total numeric(12,2);
  v_qty integer;
  v_product_id uuid;
  v_variant_id uuid;
  v_unit_price numeric(12,2);
  v_variant_label text;
  v_provider text := NULL;
  v_till_number text;
BEGIN
  IF length(trim(coalesce(p_full_name, ''))) < 2 OR length(trim(coalesce(p_full_name, ''))) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter your full name.');
  END IF;
  IF length(trim(coalesce(p_phone, ''))) < 9 OR length(trim(coalesce(p_phone, ''))) > 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Enter a valid phone number.');
  END IF;
  IF p_payment_method NOT IN ('mpesa', 'card', 'cod') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Choose a valid payment method.');
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your cart is empty or too large.');
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS i(product_id uuid, variant_id uuid, quantity integer)
    GROUP BY i.product_id, i.variant_id
    HAVING count(*) > 1
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Your cart contains a repeated item. Please refresh and try again.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS i(product_id uuid, variant_id uuid, quantity integer)
    WHERE i.product_id IS NULL OR i.quantity IS NULL OR i.quantity < 1 OR i.quantity > 50
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'One of the cart quantities is invalid.');
  END IF;

  SELECT * INTO v_zone FROM public.delivery_zones WHERE id = p_delivery_zone_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Choose an available delivery area.');
  END IF;

  IF p_payment_method = 'mpesa' AND p_mpesa_mode = 'till' THEN
    IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key = 'mpesa_till_enabled' AND value = 'true'::jsonb) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Till payments are not available right now. Please choose another M-Pesa option.');
    END IF;
    SELECT regexp_replace(value #>> '{}', '\\D', '', 'g') INTO v_till_number FROM public.site_settings WHERE key = 'mpesa_till_number';
    IF coalesce(length(v_till_number), 0) < 5 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Till payments are not available right now. Please choose another M-Pesa option.');
    END IF;
    v_provider := 'mpesa_till';
  END IF;

  -- Lock products and variants in a stable order before validating stock.
  PERFORM p.id
  FROM public.products p
  JOIN (SELECT DISTINCT product_id FROM jsonb_to_recordset(p_items) AS i(product_id uuid, variant_id uuid, quantity integer)) i ON i.product_id = p.id
  ORDER BY p.id
  FOR UPDATE OF p;
  PERFORM v.id
  FROM public.product_variants v
  JOIN (SELECT DISTINCT variant_id FROM jsonb_to_recordset(p_items) AS i(product_id uuid, variant_id uuid, quantity integer) WHERE variant_id IS NOT NULL) i ON i.variant_id = v.id
  ORDER BY v.id
  FOR UPDATE OF v;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    SELECT * INTO v_product FROM public.products WHERE id = v_product_id AND status = 'active' AND archived_at IS NULL;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'One of the items is no longer available.');
    END IF;
    v_unit_price := v_product.base_price;
    v_variant_label := NULL;
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants WHERE id = v_variant_id AND product_id = v_product_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'One of the selected options is unavailable.');
      END IF;
      IF v_variant.stock_quantity < v_qty THEN
        RETURN jsonb_build_object('ok', false, 'error', v_product.name || ' (' || v_variant.variant_value || ') only has ' || v_variant.stock_quantity || ' left.');
      END IF;
      IF v_variant.price_override IS NOT NULL THEN v_unit_price := v_variant.price_override; END IF;
      v_variant_label := v_variant.variant_type || ': ' || v_variant.variant_value;
    ELSE
      IF v_product.stock_quantity < v_qty THEN
        RETURN jsonb_build_object('ok', false, 'error', v_product.name || ' only has ' || v_product.stock_quantity || ' left.');
      END IF;
    END IF;
    v_line := jsonb_build_object(
      'product_id', v_product.id,
      'variant_id', v_variant_id,
      'product_name', v_product.name,
      'variant_label', v_variant_label,
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'line_total', round(v_unit_price * v_qty, 2)
    );
    v_lines := v_lines || jsonb_build_array(v_line);
    v_subtotal := v_subtotal + round(v_unit_price * v_qty, 2);
  END LOOP;

  v_delivery_fee := v_zone.delivery_fee;
  v_total := v_subtotal + v_delivery_fee;
  INSERT INTO public.customers(full_name, phone, email)
  VALUES (trim(p_full_name), trim(p_phone), nullif(trim(coalesce(p_email, '')), ''))
  RETURNING id INTO v_customer_id;
  INSERT INTO public.orders(customer_id, status, payment_method, payment_provider, payment_status, delivery_zone_id, delivery_address_note, subtotal, delivery_fee, total)
  VALUES (v_customer_id, 'pending', p_payment_method, v_provider, 'pending', v_zone.id, nullif(trim(coalesce(p_delivery_address_note, '')), ''), v_subtotal, v_delivery_fee, v_total)
  RETURNING id, order_number INTO v_order_id, v_order_number;
  INSERT INTO public.order_items(order_id, product_id, variant_id, product_name, variant_label, quantity, unit_price, line_total)
  SELECT v_order_id, (line->>'product_id')::uuid, nullif(line->>'variant_id', 'null')::uuid, line->>'product_name', nullif(line->>'variant_label', 'null'), (line->>'quantity')::integer, (line->>'unit_price')::numeric, (line->>'line_total')::numeric
  FROM jsonb_array_elements(v_lines) AS line;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    IF v_variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock_quantity = stock_quantity - v_qty WHERE id = v_variant_id;
    ELSE
      UPDATE public.products SET stock_quantity = stock_quantity - v_qty WHERE id = v_product_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'order_id', v_order_id, 'order_number', v_order_number, 'subtotal', v_subtotal, 'delivery_fee', v_delivery_fee, 'total', v_total, 'phone', p_phone, 'till_number', v_till_number);
END;
$$;
REVOKE ALL ON FUNCTION public.create_checkout_order(text, text, text, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(text, text, text, uuid, text, text, text, jsonb) TO service_role;