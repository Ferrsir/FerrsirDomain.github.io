import fetch from "node-fetch";
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_APPLICATION_ID) {
  throw new Error("Missing DISCORD_APPLICATION_ID");
}

if (!DISCORD_BOT_TOKEN) {
  throw new Error("Missing DISCORD_BOT_TOKEN");
}

if (!DISCORD_GUILD_ID) {
  throw new Error("Missing DISCORD_GUILD_ID");
}

const commands = [
  {
    name: "counter",
    description: "Check the Riley counter",
  },
  {
    name: "addcounter",
    description: "Increase the Riley counter",
    options: [
      {
        name: "amount",
        description: "How much to increase by",
        type: 4,
        required: false,
      },
    ],
  },
  {
    name: "setcounter",
    description: "Set the Riley counter",
    options: [
      {
        name: "amount",
        description: "What number to set the counter to",
        type: 4,
        required: true,
      },
    ],
  },
  {
    name: "resetcounter",
    description: "Reset the Riley counter to zero",
  },
];

const url = `https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/guilds/${DISCORD_GUILD_ID}/commands`;

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`Failed to register commands: ${text}`);
}

const data = await response.json();

console.log("Registered commands:");
console.log(data);
