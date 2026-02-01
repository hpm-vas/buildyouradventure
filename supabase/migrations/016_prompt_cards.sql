-- Prompt Cards Migration
-- Adds support for tone/prompt cards on open questions

-- ============================================
-- Prompt cards table (per node, not global)
-- ============================================
create table prompt_cards (
  id varchar(100) not null,
  story_id uuid not null references stories(id) on delete cascade,
  node_id varchar(100) not null,
  label varchar(100) not null,
  description text,
  icon varchar(50),
  color_class varchar(50),
  sort_order int default 0,
  created_at timestamptz default now(),

  primary key (story_id, node_id, id),
  foreign key (story_id, node_id) references story_nodes(story_id, id) on delete cascade
);

-- Index for efficient lookups
create index idx_prompt_cards_node on prompt_cards(story_id, node_id);

-- ============================================
-- Extend story_nodes for open question card config
-- ============================================
alter table story_nodes add column open_question_min_cards int default 0;
alter table story_nodes add column open_question_max_cards int default 99;
alter table story_nodes add column open_question_require_text boolean default true;

-- ============================================
-- Extend story_events for selected cards
-- ============================================
alter table story_events add column selected_card_ids text[];

-- ============================================
-- Update get_story_content function to include prompt cards
-- ============================================
create or replace function get_story_content(p_story_id uuid)
returns json as $$
declare
  v_story stories%rowtype;
  v_nodes json;
  v_items json;
begin
  -- Get story metadata
  select * into v_story from stories where id = p_story_id;
  if not found then
    return json_build_object('success', false, 'error', 'Story not found');
  end if;

  -- Get nodes with their choices, skill checks, and prompt cards
  select json_object_agg(
    n.id,
    json_build_object(
      'id', n.id,
      'title', n.title,
      'text', n.text,
      'media', case
        when n.media_image is not null or n.media_audio is not null then
          json_build_object(
            'image', n.media_image,
            'imagePosition', n.media_image_position,
            'audio', n.media_audio
          )
        else null
      end,
      'choices', coalesce((
        select json_agg(
          json_build_object(
            'id', c.id,
            'text', c.text,
            'nextNode', c.next_node,
            'grantsItems', case when array_length(c.grants_items, 1) > 0 then c.grants_items else null end,
            'returnsTo', c.returns_to,
            'skillCheck', case
              when c.skill_check_enabled then
                json_build_object(
                  'diceType', c.skill_check_dice_type,
                  'diceCount', c.skill_check_dice_count,
                  'difficulty', c.skill_check_difficulty,
                  'successNode', c.skill_check_success_node,
                  'failureNode', c.skill_check_failure_node,
                  'modifier', c.skill_check_modifier,
                  'label', c.skill_check_label
                )
              else null
            end
          ) order by c.sort_order
        )
        from story_choices c
        where c.story_id = n.story_id and c.node_id = n.id
      ), '[]'::json),
      'openQuestion', case
        when n.open_question_prompt is not null then
          json_build_object(
            'prompt', n.open_question_prompt,
            'minCards', n.open_question_min_cards,
            'maxCards', n.open_question_max_cards,
            'requireText', n.open_question_require_text,
            'cards', coalesce((
              select json_agg(
                json_build_object(
                  'id', pc.id,
                  'label', pc.label,
                  'description', pc.description,
                  'icon', pc.icon,
                  'colorClass', pc.color_class
                ) order by pc.sort_order
              )
              from prompt_cards pc
              where pc.story_id = n.story_id and pc.node_id = n.id
            ), '[]'::json)
          )
        else null
      end,
      'pending', case when n.is_pending then true else null end,
      'teaser', n.teaser,
      'grantsItems', case when array_length(n.grants_items, 1) > 0 then n.grants_items else null end,
      'explorationHub', case
        when n.exploration_hub_required_nodes is not null then
          json_build_object(
            'requiredNodes', n.exploration_hub_required_nodes,
            'summaryNodeId', n.exploration_hub_summary_node_id
          )
        else null
      end,
      'mistRevealText', n.mist_reveal_text
    )
  )
  into v_nodes
  from story_nodes n
  where n.story_id = p_story_id;

  -- Get items
  select json_object_agg(
    i.id,
    json_build_object(
      'id', i.id,
      'name', i.name,
      'description', i.description,
      'image', i.image
    )
  )
  into v_items
  from story_items i
  where i.story_id = p_story_id;

  return json_build_object(
    'success', true,
    'story', json_build_object(
      'currentNode', v_story.start_node_id,
      'nodes', coalesce(v_nodes, '{}'::json),
      'items', v_items
    )
  );
end;
$$ language plpgsql security definer;
