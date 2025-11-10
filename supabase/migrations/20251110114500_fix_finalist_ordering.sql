DROP FUNCTION IF EXISTS get_finalists_for_award(UUID);

-- This function retrieves all unique nominees for a given award_id, ordered by nomination count.
-- It's used during the FINAL_VOTING phase to get the list of candidates.
-- It handles both individual and duo awards correctly.

CREATE OR REPLACE FUNCTION get_finalists_for_award(p_award_id UUID)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    is_duo BOOLEAN,
    duo_members JSONB
) AS $$
DECLARE
    v_is_duo BOOLEAN;
BEGIN
    -- Check if the award is a duo award
    SELECT a.is_duo INTO v_is_duo FROM public.awards a WHERE a.id = p_award_id;

    IF v_is_duo THEN
        -- Logic for duo awards: count distinct nominators for each duo
        RETURN QUERY
        SELECT
            n.nomination_group_id AS id,
            STRING_AGG(u.full_name, ' & ') AS full_name,
            NULL AS avatar_url,
            TRUE as is_duo,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'id', u.id,
                    'full_name', u.full_name,
                    'avatar_url', COALESCE(u.avatar_url, 'https://picsum.photos/seed/' || u.id::text || '/200')
                )
            ) AS duo_members
        FROM
            public.nominations n
        JOIN
            public.users u ON n.nominee_user_id = u.id
        WHERE
            n.award_id = p_award_id AND n.nomination_group_id IS NOT NULL
        GROUP BY
            n.nomination_group_id
        ORDER BY
            COUNT(DISTINCT n.nominator_id) DESC;
    ELSE
        -- Logic for individual awards: count nominations for each user
        RETURN QUERY
        SELECT
            u.id,
            u.full_name,
            COALESCE(u.avatar_url, 'https://picsum.photos/seed/' || u.id::text || '/200') AS avatar_url,
            FALSE as is_duo,
            NULL::jsonb as duo_members
        FROM
            public.nominations n
        JOIN
            public.users u ON n.nominee_user_id = u.id
        WHERE
            n.award_id = p_award_id
        GROUP BY
            u.id, u.full_name, u.avatar_url
        ORDER BY
            COUNT(n.id) DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;