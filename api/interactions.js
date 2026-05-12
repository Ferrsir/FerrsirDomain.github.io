import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";

export const config = {
  api: {
    bodyParser: false,
  },
};

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ROW_ID = process.env.ROW_ID || "1";

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

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
      body: JSON.stringify({ counter: newCount }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase set error: ${text}`);
  }

  return newCount;
}

async function incrementCount(amount = 1) {
  const current = await getCount();
  const next = current + amount;

  await setCount(next);

  return next;
}

function getOption(interaction, name) {
  return interaction.data?.options?.find((option) => option.name === name);
}

function sendDiscordResponse(res, body, status = 200) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const rawBody = await readRawBody(req);

    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return res.status(401).send("Bad request signature");
    }

    const interaction = JSON.parse(rawBody);

    if (interaction.type === InteractionType.PING) {
      return sendDiscordResponse(res, {
        type: InteractionResponseType.PONG,
      });
    }

    if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
      return sendDiscordResponse(res, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: "Unsupported interaction type.",
        },
      });
    }

    const commandName = interaction.data.name;

    if (commandName === "counter") {
      const count = await getCount();

      return sendDiscordResponse(res, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Current Number of Times Riley has been a Tard:\n**${count}**`,
        },
      });
    }

    if (commandName === "addcounter") {
      const amountOption = getOption(interaction, "amount");
      const amount = amountOption?.value ?? 1;

      const newCount = await incrementCount(amount);

      return sendDiscordResponse(res, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Counter increased by ${amount}\nNew Count is **${newCount}**!`,
        },
      });
    }

    if (commandName === "setcounter") {
      const amountOption = getOption(interaction, "amount");
      const amount = amountOption?.value;

      if (amount === undefined) {
        return sendDiscordResponse(res, {
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: "You need to provide a number.",
            flags: 64,
          },
        });
      }

      const newCount = await setCount(amount);

      return sendDiscordResponse(res, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Counter set to\n${newCount}`,
        },
      });
    }

    if (commandName === "resetcounter") {
      const newCount = await setCount(0);

      return sendDiscordResponse(res, {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Counter reset to\n${newCount}`,
        },
      });
    }

    return sendDiscordResponse(res, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Unknown command.",
      },
    });
  } catch (error) {
    console.error(error);

    return sendDiscordResponse(res, {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Something went wrong with the counter.",
        flags: 64,
      },
    });
  }
}
