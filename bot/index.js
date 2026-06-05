const { Bot, session, InlineKeyboard, InputFile } = require("grammy");
const { conversations, createConversation } = require("@grammyjs/conversations");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const http = require("http");
require("dotenv").config();

// 🌐 DUMMY SERVER FOR RENDER
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VitaTON Bot is active!');
}).listen(port);

const bot = new Bot(process.env.BOT_TOKEN);

// Bot uchun SERVICE ROLE key ishlatamiz (RLS ni chetlab o'tish uchun)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
const ADMIN_ID = 6377333240; // <--- SIZNING ID RAQAMINGIZ JOYLANDI

// 🛡️ Admin tekshiruvchi yordamchi funksiya
const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID;

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

/**
 * 🛠 ADMIN: MAHSULOT QO'SHISH (CONVERSATION)
 */
async function addProduct(conversation, ctx) {
  if (ctx.from.id.toString() !== String(ADMIN_ID)) return;

  await ctx.reply("📸 Mahsulot rasmini yuboring:");
  const photoCtx = await conversation.waitFor("message:photo");
  const file = await photoCtx.getFile();
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  await ctx.reply("📝 Mahsulot nomini yozing:");
  const nameCtx = await conversation.waitFor("message:text");
  const name = nameCtx.message.text;

  await ctx.reply("💰 Narxini yozing (masalan: 25 USDT):");
  const priceCtx = await conversation.waitFor("message:text");
  const price = priceCtx.message.text;

  await ctx.reply("ℹ️ Tavsifini yozing:");
  const descCtx = await conversation.waitFor("message:text");
  const description = descCtx.message.text;

  // 1. Rasmni yuklab olish
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  const fileName = `prod_${Date.now()}.jpg`;

  // 2. Supabase Storage-ga yuklash
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(`products/${fileName}`, response.data, { contentType: 'image/jpeg' });

  if (uploadError) return ctx.reply("❌ Rasm yuklashda xato: " + uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(`products/${fileName}`);

  // 3. Bazaga yozish
  const { error: dbError } = await supabase.from('products').insert([
    { name, price, description, image_url: publicUrl }
  ]);

  if (dbError) return ctx.reply("❌ Bazaga yozishda xato: " + dbError.message);

  await ctx.reply("✅ Mahsulot muvaffaqiyatli qo'shildi!");
}

/**
 * 🖼 ADMIN: MAHSULOT RASMINI ALMASHTIRISH (CONVERSATION)
 */
async function updateProductImage(conversation, ctx) {
  if (!isAdmin(ctx)) return;

  // 1. Mahsulotlar ro'yxatini olish
  const { data: products, error } = await supabase.from('products').select('*').order('created_at', { ascending: true });

  if (error || !products || products.length === 0) {
    await ctx.reply("❌ Mahsulotlar topilmadi.");
    return;
  }

  // 2. Inline keyboard yaratish (har bir mahsulot uchun tugma)
  const kb = new InlineKeyboard();
  for (const p of products) {
    kb.text(`📦 ${p.name} — ${p.price}`, `pick_${p.id}`).row();
  }
  kb.text("❌ Bekor qilish", "cancel_update");

  await ctx.reply("🖼 Qaysi mahsulot rasmini almashtirasiz?\nTanlang:", { reply_markup: kb });

  // 3. Foydalanuvchi tugmani bosishini kutish
  const callbackCtx = await conversation.waitFor("callback_query");
  await callbackCtx.answerCallbackQuery();

  const data = callbackCtx.callbackQuery.data;

  if (data === "cancel_update") {
    await ctx.reply("❌ Bekor qilindi.");
    return;
  }

  if (!data.startsWith("pick_")) {
    await ctx.reply("Noto'g'ri tanlov.");
    return;
  }

  const productId = data.replace("pick_", "");
  const selectedProduct = products.find(p => String(p.id) === productId);

  if (!selectedProduct) {
    await ctx.reply("❌ Mahsulot topilmadi.");
    return;
  }

  await ctx.reply(`✅ "${selectedProduct.name}" tanlandi!\n\n📸 Endi yangi rasmni yuboring:`);

  // 4. Yangi rasmni kutish
  const photoCtx = await conversation.waitFor("message:photo");
  const file = await photoCtx.getFile();
  const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;

  await ctx.reply("⏳ Rasm yuklanmoqda...");

  // 5. Rasmni Supabase storage-ga yuklash
  const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
  const fileName = `prod_update_${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(`products/${fileName}`, response.data, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    await ctx.reply("❌ Rasm yuklashda xato: " + uploadError.message);
    return;
  }

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(`products/${fileName}`);

  // 6. Bazada image_url ni yangilash
  const { error: dbError } = await supabase
    .from('products')
    .update({ image_url: publicUrl })
    .eq('id', productId);

  if (dbError) {
    await ctx.reply("❌ Bazani yangilashda xato: " + dbError.message);
    return;
  }

  await ctx.reply(
    `✅ "${selectedProduct.name}" mahsulotining rasmi muvaffaqiyatli almashtirildi!\n\n` +
    `🌐 WebApp'ni yangilang — yangi rasm ko'rinadi.`
  );
}

bot.use(createConversation(addProduct));
bot.use(createConversation(updateProductImage));

// 🚀 BUYRUQLAR
bot.command("start", (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    ctx.reply(
      "👋 Xush kelibsiz, Admin!\n\n" +
      "📋 Mavjud buyruqlar:\n" +
      "/add — Yangi mahsulot qo'shish\n" +
      "/rasm — Mahsulot rasmini almashtirish ✅\n" +
      "/list — Mahsulotlar ro'yxati\n"
    );
  } else {
    ctx.reply("Xush kelibsiz! Marhamat, do'konimizdan mahsulot tanlang.");
  }
});

bot.command("add", async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    await ctx.conversation.enter("addProduct");
  } else {
    await ctx.reply("Siz admin emassiz!");
  }
});

// 🖼 YANGI: Rasm almashtirish buyrug'i
bot.command("rasm", async (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    await ctx.conversation.enter("updateProductImage");
  } else {
    await ctx.reply("Siz admin emassiz!");
  }
});

bot.command("list", async (ctx) => {
  if (ctx.from.id.toString() !== String(ADMIN_ID)) return;
  const { data: products } = await supabase.from('products').select('*');
  if (!products || products.length === 0) return ctx.reply("Mahsulotlar yo'q.");

  for (const p of products) {
    const kb = new InlineKeyboard()
      .text("🖼 Rasmni almashtirish", `updimg_${p.id}`)
      .text("🗑 O'CHIRISH", `del_${p.id}`);
    await ctx.replyWithPhoto(p.image_url, {
      caption: `📦 *${p.name}* — ${p.price}\n${p.description}`,
      parse_mode: "Markdown",
      reply_markup: kb
    });
  }
});

bot.callbackQuery(/del_(.+)/, async (ctx) => {
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
    return;
  }
  const id = ctx.match[1];
  await supabase.from('products').delete().eq('id', id);
  await ctx.editMessageCaption("🗑 Mahsulot o'chirildi.");
  await ctx.answerCallbackQuery("O'chirildi!");
});

/**
 * 📡 BUYURTMA LISTENERS
 */
supabase
  .channel('public:orders')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
    const order = payload.new;
    const keyboard = new InlineKeyboard()
      .text("✅ TASDIQLASH", `approve_${order.id}`)
      .text("❌ RAD ETISH", `reject_${order.id}`);

    // Vaqt va sana
    const now = new Date();
    const timeStr = now.toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    const messageText = `⚡️ YANGI BUYURTMA!\n\n` +
                      `👤 Mijoz: ${order.tg_username || 'noma\'lum'}\n` +
                      `📦 Mahsulot: ${order.product_name}\n` +
                      `💰 Narxi: ${order.price}\n` +
                      `🕐 Vaqt: ${timeStr}\n`;

    console.log("🔔 Yangi buyurtma keldi:", order.id);

    try {
      if (order.photo_url) {
        try {
          const response = await axios.get(order.photo_url, { responseType: 'arraybuffer' });
          await bot.api.sendPhoto(ADMIN_ID, new InputFile(Buffer.from(response.data), `r.jpg`), {
            caption: messageText,
            reply_markup: keyboard,
          });
        } catch (photoError) {
          console.error("📸 Rasm yuklashda xato, matn yuborilmoqda:", photoError.message);
          await bot.api.sendMessage(ADMIN_ID, messageText + `\n🔗 Rasm linki: ${order.photo_url}`, { reply_markup: keyboard });
        }
      } else {
        await bot.api.sendMessage(ADMIN_ID, messageText, { reply_markup: keyboard });
      }
    } catch (e) { 
      console.error("❌ Xabar yuborishda umumiy xato:", e); 
    }
  })
  .subscribe();

bot.callbackQuery(/approve_(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
      return;
    }
    const id = ctx.match[1];
    await supabase.from("orders").update({ status: "approved" }).eq("id", id);
    await ctx.answerCallbackQuery("Tasdiqlandi!");
});

bot.callbackQuery(/reject_(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
      return;
    }
    const id = ctx.match[1];
    await supabase.from("orders").update({ status: "rejected" }).eq("id", id);
    await ctx.answerCallbackQuery("Rad etildi.");
});

bot.start({
  onStart: (botInfo) => {
    console.log(`🚀 Bot ishga tushdi: @${botInfo.username}`);
  }
});
