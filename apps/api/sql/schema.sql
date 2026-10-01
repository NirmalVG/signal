-- Signal database schema.
--
-- NOTE: reconstructed from how the application code uses the database
-- (apps/api/app/services/indexer.py, answering.py, routes/*). Compare it with
-- your live Supabase project before relying on it; if your tables differ,
-- update this file so a fresh setup matches what actually works.

create extension if not exists vector;

create table if not exists repos (
  id           uuid primary key,
  name         text not null,
  status       text not null default 'processing'
               check (status in ('processing', 'extracted', 'indexing', 'indexed', 'failed')),
  ingested_at  timestamptz
);

create table if not exists chunks (
  id           bigint generated always as identity primary key,
  repo_id      uuid not null references repos (id) on delete cascade,
  file_path    text not null,
  line_number  int  not null,   -- first line of the chunk
  end_line     int  not null,
  text         text not null,
  kind         text not null,   -- code_semantic | code_window | doc kinds
  embedding    vector(1024) not null
);

create index if not exists chunks_repo_id_idx on chunks (repo_id);
create index if not exists chunks_embedding_idx
  on chunks using hnsw (embedding vector_cosine_ops);

create table if not exists queries (
  id           bigint generated always as identity primary key,
  repo_id      uuid references repos (id) on delete cascade,
  question     text not null,
  answer_hash  text,
  latency_ms   int,
  created_at   timestamptz not null default now()
);

-- Cosine-similarity search scoped to one repository.
-- similarity = 1 - cosine distance, so higher means more similar.
create or replace function match_chunks(
  query_embedding vector(1024),
  match_repo_id   uuid,
  match_count     int default 5
)
returns table (
  file_path   text,
  line_number int,
  end_line    int,
  text        text,
  kind        text,
  similarity  float
)
language sql stable
as $$
  select
    c.file_path,
    c.line_number,
    c.end_line,
    c.text,
    c.kind,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.repo_id = match_repo_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;