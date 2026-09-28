-- A team the captain has submitted for the school staff's approval.
-- Its own migration: a new enum value cannot be used in the transaction that adds it.
alter type team_status add value if not exists 'proposed' after 'draft';
