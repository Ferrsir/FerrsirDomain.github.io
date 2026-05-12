const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ROW_ID = process.env.ROW_ID || "1";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_ANNOUNCE_CHANNEL_ID = process.env.DISCORD_ANNOUNCE_CHANNEL_ID;

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function getCount() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/counter?idk=eq.${ROW_ID}&select=counter`,
    {
      method: "GET",
      headers: HEADERS,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase get error: ${text}`);
  }

  const data = await response.json();
  return data[0]?.counter ?? 0;
}

async function setCount(newCount) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/counter?idk=eq.${ROW_ID}`,
    {
      method: "PATCH",
      headers: HEADERS,
      body: JSON.stringify({
        counter: newCount,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase set error: ${text}`);
  }

  return newCount;
}

async function sendDiscordMessage(amount, newCount) {
  if (!DISCORD_BOT_TOKEN || !DISCORD_ANNOUNCE_CHANNEL_ID) {
    console.log("Missing Discord announce env variables.");
    return;
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${DISCORD_ANNOUNCE_CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: `🌐 From website:\nCounter increased by ${amount}\nNew Count is **${newCount}**!`,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord message error: ${text}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const amount = Number(req.body?.amount || 1);

    const current = await getCount();
    const next = current + amount;

    await setCount(next);
    await sendDiscordMessage(amount, next);

    return res.status(200).json({
      success: true,
      counter: next,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "Could not increment counter",
    });
  }
}
