create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null,
  email text not null,
  account_type text not null default 'customer' check (account_type in ('customer','vendor','admin')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  document_path text,
  review_note text,
  delivery_address text,
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower on public.profiles (lower(username));
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "Read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Update own profile or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    if new.status <> old.status or new.account_type <> old.account_type
       or new.username <> old.username or new.email <> old.email
       or coalesce(new.document_path,'') <> coalesce(old.document_path,'')
       or coalesce(new.review_note,'') <> coalesce(old.review_note,'') then
      raise exception 'Not allowed to change these fields';
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text := coalesce(new.raw_user_meta_data->>'account_type', 'customer');
begin
  if t not in ('customer','vendor') then t := 'customer'; end if;
  insert into public.profiles (id, full_name, username, email, account_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    t
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_approved(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and status = 'approved')
$$;
create or replace function public.is_approved_vendor(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and status = 'approved'
                 and account_type in ('vendor','admin'))
$$;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  seller_username text not null,
  name text not null,
  brand text not null,
  size text not null,
  condition text not null,
  price numeric(10,2) not null check (price > 0),
  description text,
  image_url text,
  status text not null default 'pending' check (status in ('pending','available','sold')),
  created_at timestamptz not null default now()
);
grant select on public.items to anon;
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;

create policy "Anyone sees available items" on public.items for select to anon, authenticated
  using (status = 'available');
create policy "Sellers see own items" on public.items for select to authenticated
  using (seller_id = auth.uid());
create policy "Admins see all items" on public.items for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Approved vendors submit items" on public.items for insert to authenticated
  with check (seller_id = auth.uid() and public.is_approved_vendor(auth.uid())
              and (status = 'pending' or public.has_role(auth.uid(), 'admin')));
create policy "Admins manage items" on public.items for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins or owner delete pending" on public.items for delete to authenticated
  using (public.has_role(auth.uid(), 'admin') or (seller_id = auth.uid() and status = 'pending'));

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);
grant select, insert, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "Own cart" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_approved(auth.uid()));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  item_id uuid not null references public.items(id),
  seller_id uuid not null,
  item_name text not null,
  price numeric(10,2) not null,
  delivery_address text not null,
  status text not null default 'placed' check (status in ('placed','shipped','delivered')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Buyers place orders" on public.orders for insert to authenticated
  with check (buyer_id = auth.uid() and public.is_approved(auth.uid()));
create policy "See related orders" on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins update orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.prepare_order()
returns trigger language plpgsql security definer set search_path = public as $$
declare it public.items;
begin
  select * into it from public.items where id = new.item_id for update;
  if it.id is null or it.status <> 'available' then
    raise exception 'This item is no longer available';
  end if;
  if it.seller_id = new.buyer_id then
    raise exception 'You cannot buy your own item';
  end if;
  new.seller_id := it.seller_id;
  new.item_name := it.name;
  new.price := it.price;
  new.status := 'placed';
  update public.items set status = 'sold' where id = it.id;
  delete from public.cart_items where item_id = it.id;
  return new;
end $$;
create trigger orders_prepare before insert on public.orders
  for each row execute function public.prepare_order();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  sender_username text not null,
  recipient_id uuid not null,
  recipient_username text not null,
  item_id uuid references public.items(id) on delete set null,
  item_name text,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "Send as self" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_approved(auth.uid()));
create policy "Read own conversations" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.announcements to authenticated;
grant all on public.announcements to service_role;
alter table public.announcements enable row level security;
create policy "Users read announcements" on public.announcements for select to authenticated using (true);
create policy "Admins post announcements" on public.announcements for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete announcements" on public.announcements for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins read documents" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.has_role(auth.uid(), 'admin'));
create policy "Owners and admins read item images" on storage.objects for select to authenticated
  using (bucket_id = 'item-images' and ((storage.foldername(name))[1] = auth.uid()::text
         or public.has_role(auth.uid(), 'admin')));
create policy "Vendors upload item images" on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = auth.uid()::text
              and public.is_approved_vendor(auth.uid()));

do $$
declare admin_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
    'admin@pastimes.local', extensions.crypt('Ad!min@123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Master Admin","username":"Admin"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), admin_id, admin_id::text,
    jsonb_build_object('sub', admin_id::text, 'email', 'admin@pastimes.local', 'email_verified', true),
    'email', now(), now(), now());
  update public.profiles set account_type = 'admin', status = 'approved' where id = admin_id;
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');

  insert into public.items (seller_id, seller_username, name, brand, size, condition, price, image_url, status) values
    (admin_id, 'Admin', 'Trucker denim jacket', 'Levi''s', 'M', 'Excellent', 650, '/images/jacket.jpg', 'available'),
    (admin_id, 'Admin', 'Floral midi dress', 'Zara', 'S', 'Like new', 320, '/images/dress.jpg', 'available'),
    (admin_id, 'Admin', 'Leather court sneakers', 'Common Projects', 'UK 9', 'Good', 1450, '/images/sneakers.jpg', 'available'),
    (admin_id, 'Admin', 'Stonewash denim jacket', 'Wrangler', 'L', 'Good', 480, '/images/jacket.jpg', 'available'),
    (admin_id, 'Admin', 'Garden print sundress', 'Woolworths', 'M', 'Excellent', 260, '/images/dress.jpg', 'available'),
    (admin_id, 'Admin', 'Minimal white trainers', 'Veja', 'UK 6', 'Like new', 980, '/images/sneakers.jpg', 'available');
end $$;