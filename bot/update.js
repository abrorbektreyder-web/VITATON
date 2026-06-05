const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:P6QZ.%2387zry5%2CpY@db.hgseeddhszfpozzqoihz.supabase.co:5432/postgres'
});

async function update() {
  try {
    await client.connect();
    
    await client.query("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1000' WHERE id = 1");
    await client.query("UPDATE products SET image_url = 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1000' WHERE id = 2");
    
    console.log('Successfully updated product images in DB!');
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

update();
