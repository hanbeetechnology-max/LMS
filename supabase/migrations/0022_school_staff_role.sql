-- Multi-school platform, step 1 (see the approved plan). A new enum value can
-- not be used in the same transaction that adds it, so this is its own
-- migration. `staff` keeps meaning Hanbee staff; `school_staff` is new and is
-- deliberately NOT covered by is_staff_or_manager().
alter type user_role add value if not exists 'school_staff';
