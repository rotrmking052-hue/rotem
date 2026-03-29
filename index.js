require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Events,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ],
});

const OWNER_ID = process.env.OWNER_ID;

/* =========================
   HELPER
========================= */
function ch(guild, name) {
  return guild.channels.cache.find(c => c.name === name);
}

function log(guild, text) {
  const c = ch(guild, "🧾・bot-approval-log");
  if (c) c.send(text);
}

/* =========================
   BOT JOIN SYSTEM
========================= */
client.on(Events.GuildMemberAdd, async (member) => {
  if (!member.user.bot) return;

  const now = new Date().toLocaleString();

  /* 📝 BOT REQUEST */
  const requestEmbed = new EmbedBuilder()
    .setTitle("📝 Bot Request")
    .setDescription(`🤖 **${member.user.tag}**`)
    .addFields(
      { name: "📌 Status", value: "Waiting for approval", inline: true },
      { name: "🕒 Time", value: now, inline: true }
    )
    .setColor("Yellow");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_${member.id}`)
      .setLabel("Approve ✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`reject_${member.id}`)
      .setLabel("Reject ❌")
      .setStyle(ButtonStyle.Danger)
  );

  ch(member.guild, "📝・bot-request")?.send({
    embeds: [requestEmbed],
    components: [row]
  });

  /* 🔐 SECURITY REVIEW */
  ch(member.guild, "🔐・bot-security-review")?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🔐 Security Review")
        .setDescription(`Bot: ${member.user.tag}`)
        .addFields(
          { name: "Behavior", value: "Checking...", inline: true },
          { name: "Trust", value: "Unknown", inline: true },
          { name: "Suspicious", value: "Scanning...", inline: true }
        )
        .setColor("Blue")
    ]
  });

  /* 📋 PERMISSION AUDIT */
  const perms = member.permissions.toArray();

  ch(member.guild, "📋・permission-audit")?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("📋 Permission Audit")
        .setDescription(`🤖 ${member.user.tag}`)
        .addFields({
          name: "Permissions",
          value: perms.join(", ") || "None"
        })
        .setColor("Orange")
    ]
  });

  /* 🚨 RISK */
  let riskLevel = "Low";
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    riskLevel = "High";
  }

  ch(member.guild, "🚨・risk-assessment")?.send({
    embeds: [
      new EmbedBuilder()
        .setTitle("🚨 Risk Assessment")
        .setDescription(`🤖 ${member.user.tag}`)
        .addFields({ name: "Risk Level", value: riskLevel })
        .setColor(riskLevel === "High" ? "Red" : "Green")
    ]
  });

  /* 🧾 LOG */
  log(member.guild, `🤖 Bot joined: ${member.user.tag} | ${now}`);
});

/* =========================
   BUTTON HANDLER
========================= */
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "❌ Only owner", ephemeral: true });
  }

  const [action, botId] = interaction.customId.split("_");

  const member = await interaction.guild.members.fetch(botId).catch(() => null);
  if (!member) return;

  if (action === "approve") {
    ch(interaction.guild, "✅・bot-successfully")?.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Bot Approved")
          .setDescription(`🤖 ${member.user.tag}`)
          .addFields({
            name: "Approved by",
            value: interaction.user.tag
          })
          .setColor("Green")
      ]
    });

    log(interaction.guild, `✅ Approved: ${member.user.tag}`);

    await interaction.reply({ content: "✅ Approved", ephemeral: true });
  }

  if (action === "reject") {
    await member.ban({ reason: "Bot rejected" }).catch(() => {});

    log(interaction.guild, `❌ Rejected: ${member.user.tag}`);

    await interaction.reply({ content: "❌ Rejected & Removed", ephemeral: true });
  }
});

/* =========================
   LOGIN
========================= */
client.login(process.env.TOKEN);