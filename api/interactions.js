import nacl from "tweetnacl";

export const config = {
  api: {
    bodyParser: false,
  },
};

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function verifyDiscordRequest(rawBody, signature, timestamp, publicKey) {
  if (!signature || !timestamp || !publicKey) {
    return false;
  }

  const message = Buffer.from(timestamp + rawBody);
  const sig = Buffer.from(signature, "hex");
  const key = Buffer.from(publicKey, "hex");

  return nacl.sign.detached.verify(message, sig, key);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const rawBody = await readRawBody(req);

    console.log("Discord public key exists:", Boolean(DISCORD_PUBLIC_KEY));
    console.log("Discord public key length:", DISCORD_PUBLIC_KEY?.length);
    console.log("Signature exists:", Boolean(signature));
    console.log("Timestamp exists:", Boolean(timestamp));

    const isValid = verifyDiscordRequest(
      rawBody,
      signature,
      timestamp,
      DISCORD_PUBLIC_KEY
    );

    console.log("Signature valid:", isValid);

    if (!isValid) {
      return res.status(401).send("Bad request signature");
    }

    const interaction = JSON.parse(rawBody);

    // Discord PING = type 1
    if (interaction.type === 1) {
      return res.status(200).json({
        type: 1
      });
    }

    return res.status(200).json({
      type: 4,
      data: {
        content: "Endpoint works."
      }
    });

  } catch (error) {
    console.error("Function error:", error);
    return res.status(500).send("Internal server error");
  }
}
