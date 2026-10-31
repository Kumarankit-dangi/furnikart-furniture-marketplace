CREATE UNIQUE INDEX sellers_user_id_unique_idx
  ON public.sellers USING btree (user_id)
  WHERE (user_id IS NOT NULL);
--> statement-breakpoint
