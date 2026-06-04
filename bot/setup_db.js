const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:P6QZ.%2387zry5%2CpY@db.hgseeddhszfpozzqoihz.supabase.co:5432/postgres",
});

async function setup() {
  try {
    await client.connect();
    console.log("🚀 BAZAGA ULANDIK!");

    const sql = `
      -- 1. Mahsulotlarni hamma ko'rishi uchun ruxsat berish
      ALTER TABLE products DISABLE ROW LEVEL SECURITY;

      -- 2. Rasmlar saqlanadigan joyni hamma ko'rishi uchun ruxsat
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
        ) THEN
          CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);
        END IF;
      END
      $$;

      -- 3. Hamma storage bucket-larni "public" qilishga harakat qilamiz
      UPDATE storage.buckets SET public = true;
    `;

    await client.query(sql);
    console.log("✅ BAZA SOZLAMALARI MUVAFFARIYATLI O'ZGARTIRILDI!");

  } catch (err) {
    console.error("❌ Xatolik yuz berdi:", err.message);
  } finally {
    await client.end();
  }
}

setup();
