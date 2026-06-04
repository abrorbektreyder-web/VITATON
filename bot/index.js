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
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const ADMIN_ID = 6377333240; // <--- SIZNING ID RAQAMINGIZ JOYLANDI

// 🛡️ Admin tekshiruvchi yordamchi funksiya
const isAdmin = (ctx) => ctx.from?.id === ADMIN_ID;

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());

/**
 * 🛠 ADMIN: MAHSULOT QO'SHISH (CONVERSATION)
 */
async function addProduct(conversation, ctx) {
  if (ctx.from.id.toString() !== ADMIN_ID) return;

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
    .from('receipts') // receipts bucket-ini ishlatamiz (yoki yangi ochish mumkin)
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

bot.use(createConversation(addProduct));

// 🚀 BUYRUQLAR
bot.command("start", (ctx) => {
  if (ctx.from.id === ADMIN_ID) {
    ctx.reply("Xush kelibsiz, Admin! Mahsulot qo'shish uchun /add buyrug'idan foydalaning.");
  } else {
    ctx.reply("Xush kelibsiz! Marhamat, do'konimizdan mahsulot tanlang.");
  }
});

bot.command("add", async (ctx) => {
  if (ctx.from.id.toString() === ADMIN_ID) {
    await ctx.conversation.enter("addProduct");
  } else {
    await ctx.reply("Siz admin emassiz!");
  }
});

bot.command("list", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const { data: products } = await supabase.from('products').select('*');
  if (!products || products.length === 0) return ctx.reply("Mahsulotlar yo'q.");

  for (const p of products) {
    const kb = new InlineKeyboard().text("🗑 O'CHIRISH", `del_${p.id}`);
    await ctx.reply(`📦 ${p.name} - ${p.price}\n${p.description}`, { reply_markup: kb });
  }
});

bot.callbackQuery(/del_(.+)/, async (ctx) => {
  // 🛡️ ADMIN TEKSHIRUVI
  if (!isAdmin(ctx)) {
    await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
    return;
  }
  const id = ctx.match[1];
  await supabase.from('products').delete().eq('id', id);
  await ctx.editMessageText("🗑 Mahsulot o'chirildi.");
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

    const messageText = `⚡️ YANGI BUYURTMA!\n\n` +
                      `👤 Mijoz: ${order.tg_username || 'noma\'lum'}\n` +
                      `📦 Mahsulot: ${order.product_name}\n` +
                      `💰 Narxi: ${order.price}\n`;

    try {
      if (order.photo_url) {
        const response = await axios.get(order.photo_url, { responseType: 'arraybuffer' });
        await bot.api.sendPhoto(ADMIN_ID, new InputFile(Buffer.from(response.data), `r.jpg`), {
          caption: messageText,
          reply_markup: keyboard,
        });
      } else {
        await bot.api.sendMessage(ADMIN_ID, messageText, { reply_markup: keyboard });
      }
    } catch (e) { console.log(e); }
  })
  .subscribe();

bot.callbackQuery(/approve_(.+)/, async (ctx) => {
    // 🛡️ ADMIN TEKSHIRUVI
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
      return;
    }
    const id = ctx.match[1];
    await supabase.from("orders").update({ status: "approved" }).eq("id", id);
    await ctx.answerCallbackQuery("Tasdiqlandi!");
});

bot.callbackQuery(/reject_(.+)/, async (ctx) => {
    // 🛡️ ADMIN TEKSHIRUVI
    if (!isAdmin(ctx)) {
      await ctx.answerCallbackQuery({ text: "⛔ Siz admin emassiz!", show_alert: true });
      return;
    }
    const id = ctx.match[1];
    await supabase.from("orders").update({ status: "rejected" }).eq("id", id);
    await ctx.answerCallbackQuery("Rad etildi.");
});

bot.start();
