-- Run this script in the Supabase SQL Editor.
-- Existing Supabase Auth users and settings are not modified.

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 100),
  status text not null default 'open' check (status in ('open', 'completed')),
  created_at timestamptz not null default now(),
  constraint bills_id_user_id_key unique (id, user_id)
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  planned_qty text,
  is_marked boolean not null default false,
  marked_at timestamptz,
  created_at timestamptz not null default now()
);

-- Upgrade the previous app's shopping_items table without dropping its rows.
do $shopping_items_migration$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'name'
  ) then
    alter table public.shopping_items add column name text;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'item_name'
    ) then
      execute $sql$update public.shopping_items
        set name = coalesce(nullif(btrim(item_name), ''), 'Shopping item')$sql$;
    else
      update public.shopping_items set name = 'Shopping item';
    end if;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'planned_qty'
  ) then
    alter table public.shopping_items add column planned_qty text;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'quantity'
    ) then
      execute 'update public.shopping_items set planned_qty = quantity::text';
    end if;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'is_marked'
  ) then
    alter table public.shopping_items add column is_marked boolean;
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'is_purchased'
    ) then
      execute 'update public.shopping_items set is_marked = coalesce(is_purchased, false)';
    else
      update public.shopping_items set is_marked = false;
    end if;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'marked_at'
  ) then
    alter table public.shopping_items add column marked_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shopping_items' and column_name = 'created_at'
  ) then
    alter table public.shopping_items add column created_at timestamptz not null default now();
  end if;
end;
$shopping_items_migration$;

alter table public.shopping_items alter column name set not null;
alter table public.shopping_items alter column is_marked set default false;
alter table public.shopping_items alter column is_marked set not null;

create table if not exists public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null check (length(btrim(item_name)) between 1 and 100),
  actual_qty numeric not null check (actual_qty > 0),
  qty_unit text not null check (qty_unit in ('g', 'kg', 'ml', 'l', 'unit/packet', 'half', 'full')),
  unit_price_rate numeric not null check (unit_price_rate >= 0),
  unit_price_base text not null check (unit_price_base in ('per 1kg', 'per 100g', 'per 1g', 'per 1l', 'per 100ml', 'per 1ml', 'per item/pack')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  discount_type text not null default 'LKR' check (discount_type in ('LKR', '%')),
  final_item_price numeric not null check (final_item_price >= 0),
  created_at timestamptz not null default now(),
  constraint bill_items_percentage_discount_max check (discount_type <> '%' or discount_value <= 100),
  constraint bill_items_bill_owner_fk foreign key (bill_id, user_id)
    references public.bills(id, user_id) on delete cascade
);

create index if not exists shopping_items_user_created_idx
  on public.shopping_items (user_id, created_at);
create index if not exists bills_user_created_idx
  on public.bills (user_id, created_at desc);
create index if not exists bill_items_user_bill_created_idx
  on public.bill_items (user_id, bill_id, created_at);

alter table public.bills enable row level security;
alter table public.shopping_items enable row level security;
alter table public.bill_items enable row level security;

drop policy if exists "Users manage their own bills" on public.bills;
create policy "Users manage their own bills"
  on public.bills for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their own shopping items" on public.shopping_items;
create policy "Users manage their own shopping items"
  on public.shopping_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read their own bill items" on public.bill_items;
create policy "Users read their own bill items"
  on public.bill_items for select
  using (auth.uid() = user_id);

drop policy if exists "Users add bill items to their own bills" on public.bill_items;
create policy "Users add bill items to their own bills"
  on public.bill_items for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.bills
      where bills.id = bill_items.bill_id
        and bills.user_id = auth.uid()
        and bills.status = 'open'
    )
  );

drop policy if exists "Users update their own bill items" on public.bill_items;
create policy "Users update their own bill items"
  on public.bill_items for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.bills
      where bills.id = bill_items.bill_id
        and bills.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete their own bill items" on public.bill_items;
create policy "Users delete their own bill items"
  on public.bill_items for delete
  using (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.bills to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, update, delete on public.bill_items to authenticated;