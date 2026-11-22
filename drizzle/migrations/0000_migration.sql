DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.template_likes;
CREATE POLICY "Users can view own likes" ON public.template_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_creator_profiles(_ids uuid[])
RETURNS TABLE(id uuid, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar_url FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (SELECT 1 FROM public.public_templates t WHERE t.user_id = p.id)
$$;

CREATE OR REPLACE FUNCTION public.get_template_like_counts(_ids uuid[])
RETURNS TABLE(template_id uuid, like_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.template_id, count(*) FROM public.template_likes l
  WHERE l.template_id = ANY(_ids) GROUP BY l.template_id
$$;

REVOKE ALL ON FUNCTION public.get_creator_profiles(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_template_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_creator_profiles(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_template_like_counts(uuid[]) TO anon, authenticated;