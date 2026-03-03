// =============================
// 🦅 FALCON CLEAN PRODUCTION BUILD
// =============================

// ===== CRASH PROTECTION =====
process.on("unhandledRejection", (err) => console.error(err));
process.on("uncaughtException", (err) => console.error(err));

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActivityType
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("./config.json");

// ===== PATHS =====
const dataFolder = path.join(__dirname, "data");
const adminsPath = path.join(dataFolder, "admins.json");
const settingsPath = path.join(dataFolder, "settings.json");
const afkPath = path.join(dataFolder, "afk.json");

// ===== SAFE JSON =====
function loadJSON(file, def) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(def, null, 2));
    return def;
  }
  try {
    const data = fs.readFileSync(file);
    return data.length ? JSON.parse(data) : def;
  } catch {
    return def;
  }
}

function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ===== LOAD DATA =====
let admins = loadJSON(adminsPath, {
  owners: ["1061482365014265936"],
  admins: []
});
let settings = loadJSON(settingsPath, {});
let afkData = loadJSON(afkPath, {});

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ]
});

// ===== READY =====
client.once("ready", () => {
  console.log(`🦅 Falcon online as ${client.user.tag}`);
  client.user.setPresence({
    status: "online",
    activities: [{ name: "Watching You~! :3", type: ActivityType.Playing }]
  });
});

// ===== GUILD RESTRICT =====
client.on("guildCreate", (guild) => {
  if (!config.allowedGuilds.includes(guild.id)) guild.leave();
});

// ===== HELPERS =====
function isAdmin(userId, guildId) {
  if (admins.owners.includes(userId)) return true;
  return admins.guildAdmins[guildId]?.includes(userId);
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000) % 24;
  const d = Math.floor(ms / 86400000);
  return `${d}d ${h}h ${m}m ${s}s`;
}

// =============================
// ===== MESSAGE HANDLER =====
// =============================
client.on("messageCreate", async (message) => {
if (message.author.bot) return;
if (!message.guild) return;
if (!config.allowedGuilds.includes(message.guild.id)) return;

const guildId = message.guild.id;
    
    // =============================
// 💤 AFK RETURN (PER SERVER)
// =============================
if (afkData[guildId] && afkData[guildId][message.author.id]) {

  const data = afkData[guildId][message.author.id];
  const duration = Date.now() - data.since;

  const count = data.count || 0;
  const users =
    data.users?.map(id => `<@${id}>`).join(", ") || "No one";

  delete afkData[guildId][message.author.id];
  saveJSON(afkPath, afkData);

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("👋 Welcome Back")
    .setDescription(
      `**AFK Duration:** ${formatDuration(duration)}\n` +
      `**Times Pinged:** ${count}\n` +
      `**Pinged By:** ${users}`
    )
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}


// =============================
// 💤 AFK MENTION (PER SERVER)
// =============================
message.mentions.users.forEach(async (user) => {

  if (!afkData[guildId] || !afkData[guildId][user.id]) return;

  if (
    message.content.includes("http") ||
    message.content.includes("discord.gg") ||
    message.content.includes("@everyone") ||
    message.content.includes("@here")
  ) return;

  const data = afkData[guildId][user.id];

  data.count = (data.count || 0) + 1;

  if (!data.users) data.users = [];
  if (!data.users.includes(message.author.id)) {
    data.users.push(message.author.id);
  }

  saveJSON(afkPath, afkData);

  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle("💤 User is AFK")
    .setDescription(
      `Reason: ${data.reason}\nAway: <t:${Math.floor(data.since / 1000)}:R>`
    );

  message.channel.send({ embeds: [embed] });

  if (data.dm) {
    const afkUser = await client.users.fetch(user.id);
    afkUser.send(
      `You were mentioned by ${message.author.tag}\n\n` +
      `Server: ${message.guild.name}\n` +
      `Channel: #${message.channel.name}\n\n` +
      `Message:\n${message.content}`
    ).catch(() => {});
  }
});

// ===== PREFIX PARSER =====
if (!message.content.startsWith(config.prefix)) return;

const args = message.content.slice(config.prefix.length).trim().split(/ +/);
const cmd = args.shift().toLowerCase();

  // ===== AFK RETURN =====
if (afkData[message.author.id]) {
  const data = afkData[message.author.id];
  const duration = Date.now() - data.since;

  const count = data.count || 0;
  const users =
    data.users?.map(id => `<@${id}>`).join(", ") || "No one";

  delete afkData[message.author.id];
  saveJSON(afkPath, afkData);

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("👋 Welcome Back")
    .setDescription(
      `**AFK Duration:** ${formatDuration(duration)}\n` +
      `**Times Pinged:** ${count}\n` +
      `**Pinged By:** ${users}`
    )
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}

  // ===== AFK MENTION =====
message.mentions.users.forEach(async (user) => {
  if (!afkData[user.id]) return;

  // 🚫 Anti-abuse filter
  if (
    message.content.includes("http") ||
    message.content.includes("discord.gg") ||
    message.content.includes("@everyone") ||
    message.content.includes("@here")
  ) return;

  const data = afkData[user.id];

  // Increase count
  data.count = (data.count || 0) + 1;

  // Store unique users
  if (!data.users) data.users = [];
  if (!data.users.includes(message.author.id)) {
    data.users.push(message.author.id);
  }

  saveJSON(afkPath, afkData);

  // Server reply embed
  const embed = new EmbedBuilder()
    .setColor("Orange")
    .setTitle("💤 User is AFK")
    .setDescription(
      `Reason: ${data.reason}\nAway: <t:${Math.floor(data.since / 1000)}:R>`
    );

  message.channel.send({ embeds: [embed] });

  // DM full message if enabled
  if (data.dm) {
    const afkUser = await client.users.fetch(user.id);

    afkUser.send(
      `You were mentioned by ${message.author.tag}\n\n` +
      `Server: ${message.guild.name}\n` +
      `Channel: #${message.channel.name}\n\n` +
      `Message:\n${message.content}`
    ).catch(() => {});
  }
});
    
// ===== AFK =====
if (cmd === "afk") {

  const reason = args.join(" ") || "No reason provided";

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("💤 AFK Confirmation")
    .setDescription(`Reason: ${reason}\nEnable DM notifications?`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("afk_yes")
      .setLabel("Yes")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("afk_no")
      .setLabel("No")
      .setStyle(ButtonStyle.Danger)
  );

  const msg = await message.channel.send({
    embeds: [embed],
    components: [row]
  });

  const filter = i => i.user.id === message.author.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 15000 });

  collector.on("collect", async (interaction) => {

    const dm = interaction.customId === "afk_yes";

    if (!afkData[guildId]) afkData[guildId] = {};

    afkData[guildId][message.author.id] = {
      reason,
      since: Date.now(),
      dm,
      count: 0,
      users: []
    };

    saveJSON(afkPath, afkData);

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("💤 AFK Enabled")
          .setDescription(
            `Reason: ${reason}\nDM: ${dm ? "Enabled" : "Disabled"}`
          )
      ],
      components: []
    });
  });
}
    
  // ===== UPTIME =====
  if (cmd === "uptime") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle("⏳ Uptime")
          .setDescription(formatDuration(client.uptime))
      ]
    });
  }

  // ===== ABOUT =====
  if (cmd === "about") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Yellow")
          .setTitle("🦅 About Falcon Modmail")
          .setDescription(
"**Falcon Modmail**\n" +
"Lightweight alliance management & attendance system.\n\n" +

"👤 **Developer**\n" +
"• **[mvixie](https://discord.com/users/1061482365014265936)**\n\n" +

"⚡ Designed for efficient attendance tracking,\n" +
"activity logging, AFK management, and staff monitoring.\n\n" +

"━━━━━━━━━━━━━━━━━━━━━━\n" +
"Falcon Modmail • Professional Server Utility"
)
      ]
    });
  }

  // ===== CALC =====
  if (cmd === "calc") {
    const exp = args.join(" ");
    if (!exp) return message.reply("Provide expression.");
    try {
      const result = eval(exp.replace(/[^0-9+\-*/%.() ]/g, ""));
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🧮 Calculator")
            .addFields(
              { name: "Expression", value: `\`${exp}\`` },
              { name: "Result", value: `\`${result}\`` }
            )
        ]
      });
    } catch {
      return message.reply("Invalid expression.");
    }
  }

  // ===== TIMER =====
  if (cmd === "timer") {
    const input = args[0];
    if (!input) return message.reply("Provide duration (10s, 5m, 1h).");

    const unit = input.slice(-1);
    const val = parseInt(input.slice(0, -1));
    let ms = 0;
    if (unit === "s") ms = val * 1000;
    if (unit === "m") ms = val * 60000;
    if (unit === "h") ms = val * 3600000;
    if (unit === "d") ms = val * 86400000;

    const end = Math.floor((Date.now() + ms) / 1000);

    message.channel.send(
      `${message.author.username} set a timer ending <t:${end}:R>`
    );

    setTimeout(() => {
      message.channel.send(`⏰ ${message.author.username}, timer ended.`);
    }, ms);
  }

  // ===== AVATAR =====
  if (cmd === "av") {
    const user = message.mentions.users.first() || message.author;
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle(`🖼 Avatar - ${user.username}`)
          .setImage(user.displayAvatarURL({ size: 1024 }))
      ]
    });
  }

  // ===== BANNER =====
  if (cmd === "ba") {
    const user = message.mentions.users.first() || message.author;
    const fetched = await client.users.fetch(user.id, { force: true });
    if (!fetched.banner) return message.reply("No banner found.");

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle(`🖼 Banner - ${user.username}`)
          .setImage(fetched.bannerURL({ size: 1024 }))
      ]
    });
  }

  // ===== HELP =====
  if (cmd === "help") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle("__**🦅 Falcon Modmail**__")
          .setDescription(
"Falcon Modmail is a small utility bot designed to manage attendance, logging, AFK, and server tools efficiently.\n\n" +

"💻 **Command Center** ⚡\n\n" +

"**.uptime**\n" +
"→ Displays how long the bot has been online and running.\n\n" +

"**.calc <expression>**\n" +
"→ Performs mathematical calculations.\n" +
"Example: `.calc 25*4`\n\n" +

"**.timer <time>**\n" +
"→ Starts a countdown timer.\n" +
"Example: `.timer 10m / 10h / 10s / 10d`\n\n" +

"**.av <user>**\n" +
"→ Displays the avatar of a mentioned user or yourself.\n\n" +

"**.ba <user>**\n" +
"→ Shows the banner of a mentioned user or yourself.\n\n" +

"**.about**\n" +
"→ Displays information about the bot.\n\n" +

"**.afk <reason>**\n" +
"→ Sets your AFK (Away From Keyboard) status.\n\n" +

"**.list**\n" +
"→ Shows the list of both active and inactive staff members.\n\n" +

"**.listactive**\n" +
"→ Shows the server's active staff.\n\n" +

"**.listinactive**\n" +
"→ Shows the server's inactive staff.\n\n" +

"**.ahelp**\n" +
"→ Displays administrator-only bot commands.\n\n" +

"━━━━━━━━━━━━━━━━━━━━━━\n" +
"Developed by: **[mvixie](https://discord.com/users/1061482365014265936)**"
)
      ]
    });
  }

  // ===== AHELP =====
  if (cmd === "ahelp") {
    if (!isAdmin(message.author.id, message.guild.id))
      return message.reply("❌ No permission.");

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Purple")
          .setTitle("🦅Falcon Modmail – Bot Administrator Commands")
          .setDescription(
"These commands are restricted to server bot administrators.\n" +
"Use them carefully to manage attendance system configuration and permissions.\n\n" +

"👑 **Administrator Command Center** ⚡\n\n" +

"**.afkclear <user>**\n" +
"→ Removes the AFK status of a specific user.\n\n" +

"**.reseta**\n" +
"→ Resets the entire attendance database.\n\n" +

"**.panel**\n" +
"→ Sends or refreshes the main attendance panel.\n\n" +

"**.admin add {user}**\n" +
"→ Grants bot administrator permissions to a user.\n\n" +

"**.admin remove {user}**\n" +
"→ Removes bot administrator permissions from a user.\n\n" +

"**.admin show**\n" +
"→ Displays all users with bot administrator access.\n\n" +

"**.setup show**\n" +
"→ Displays current attendance configuration settings.\n\n" +

"**.setup attendance {channel}**\n" +
"→ Sets the channel used for attendance tracking.\n\n" +

"**.setup log {channel}**\n" +
"→ Sets the channel used for attendance activity logs.\n\n" +

"**.setup activerole {role}**\n" +
"→ Assigns the role given to active members.\n\n" +

"**.setup inactiverole {role}**\n" +
"→ Assigns the role given to inactive members.\n\n" +

"━━━━━━━━━━━━━━━━━━━━━━\n" +
"Developed by: **[mvixie](https://discord.com/users/1061482365014265936)**"
)
      ]
    });
  }

// ===== ADMIN =====
if (cmd === "admin") {

  const guildId = message.guild.id;

  if (!isAdmin(message.author.id, guildId))
    return message.reply("❌ No permission.");

  // Ensure this server has its own admin list
  if (!admins.guildAdmins[guildId]) {
    admins.guildAdmins[guildId] = [];
  }

  const action = args[0];
  const target =
    message.mentions.users.first() ||
    client.users.cache.get(args[1] || args[0]);

  // ===== ADD =====
  if (action === "add") {
    if (!target) return message.reply("Provide valid user.");
    if (admins.owners.includes(target.id))
      return message.reply("Primary admin protected.");

    if (!admins.guildAdmins[guildId].includes(target.id)) {
      admins.guildAdmins[guildId].push(target.id);
      saveJSON(adminsPath, admins);
    }

    return message.reply(`Added ${target} as admin for this server.`);
  }

  // ===== REMOVE =====
  if (action === "remove") {
    if (!target) return message.reply("Provide valid user.");
    if (admins.owners.includes(target.id))
      return message.reply("Cannot remove primary admin.");

    admins.guildAdmins[guildId] =
      admins.guildAdmins[guildId].filter(id => id !== target.id);

    saveJSON(adminsPath, admins);

    return message.reply(`Removed ${target} from this server.`);
  }

  // ===== SHOW =====
  if (action === "show") {

    const list =
      admins.guildAdmins[guildId]?.map(id => `<@${id}>`).join("\n") || "None";

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("White")
          .setTitle("👑 Server Admins")
          .setDescription(list)
      ]
    });
  }
}


    
      // ===== SETUP =====
  if (cmd === "setup") {
    if (!isAdmin(message.author.id, message.guild.id))
      return message.reply("❌ No permission.");

    const type = args[0];
    if (!type) return message.reply("Provide setup type.");

    if (!settings[guildId]) settings[guildId] = {};

    if (type === "show") {
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("⚙ Current Attendance Configuration")
        .setDescription(
          `📋 Attendance Channel\n<#${
            settings[guildId]?.attendance || "Not Set"
          }>\n\n📑 Log Channel\n<#${
            settings[guildId]?.log || "Not Set"
          }>\n\n🟢 Active Role\n<@&${
            settings[guildId]?.activeRole || "Not Set"
          }>\n\n🔴 Inactive Role\n<@&${
            settings[guildId]?.inactiveRole || "Not Set"
          }>`
        );
      return message.channel.send({ embeds: [embed] });
    }

    const mention =
      message.mentions.channels.first() ||
      message.mentions.roles.first();
    const id = mention?.id || args[1];

    if (!id) return message.reply("Provide valid mention or ID.");

    if (type === "attendance") settings[guildId].attendance = id;
    if (type === "log") settings[guildId].log = id;
    if (type === "activerole") settings[guildId].activeRole = id;
    if (type === "inactiverole") settings[guildId].inactiveRole = id;

    saveJSON(settingsPath, settings);

    return message.reply(`✅ ${type} updated successfully.`);
  }

  // ===== RESET ATTENDANCE =====
  if (cmd === "reseta") {
    if (!isAdmin(message.author.id, message.guild.id))
      return message.reply("❌ No permission.");

    if (!settings[guildId]?.activeRole || !settings[guildId]?.inactiveRole)
      return message.reply("Roles not configured.");

    const activeRole = message.guild.roles.cache.get(
      settings[guildId].activeRole
    );
    const inactiveRole = message.guild.roles.cache.get(
      settings[guildId].inactiveRole
    );

    if (activeRole) {
      for (const member of activeRole.members.values()) {
        await member.roles.remove(activeRole).catch(() => {});
      }
    }

    if (inactiveRole) {
      for (const member of inactiveRole.members.values()) {
        await member.roles.remove(inactiveRole).catch(() => {});
      }
    }

    // Confirmation in current channel
    message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Orange")
          .setTitle("🔄 Attendance Reset")
          .setDescription("All attendance roles have been cleared.")
      ]
    });

    // Ping in attendance channel
    if (settings[guildId]?.attendance) {
      const attChannel = message.guild.channels.cache.get(
        settings[guildId].attendance
      );
      if (attChannel) {
        attChannel.send(
          "@everyone Mark Your Today's Attendance"
        );
      }
    }

    // Log if log channel set
    if (settings[guildId]?.log) {
      const logChannel = message.guild.channels.cache.get(
        settings[guildId].log
      );
      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor("Orange")
              .setTitle("🔄 Attendance Reset Used")
              .setDescription(`Used by ${message.author}`)
              .setTimestamp()
          ]
        });
      }
    }
  }
    
// ===== AFK CLEAR (ADMIN ONLY - PER SERVER) =====
if (cmd === "afkclear") {

  if (!isAdmin(message.author.id, message.guild.id))
    return message.reply("❌ No permission.");

  const guildId = message.guild.id;
  const target =
    message.mentions.users.first() ||
    client.users.cache.get(args[0]);

  if (!target)
    return message.reply("Mention a valid user or provide ID.");

  if (!afkData[guildId] || !afkData[guildId][target.id])
    return message.reply("That user is not AFK in this server.");

  delete afkData[guildId][target.id];
  saveJSON(afkPath, afkData);

  const embed = new EmbedBuilder()
    .setColor("Red")
    .setTitle("🧹 AFK Cleared")
    .setDescription(
      `AFK removed for ${target}\nCleared by ${message.author}`
    )
    .setTimestamp();

  message.channel.send({ embeds: [embed] });
}
    
    // ===== PANEL =====
if (cmd === "panel") {
  if (!isAdmin(message.author.id, message.guild.id))
    return message.reply("❌ No permission.");

  if (!settings[guildId]?.attendance)
    return message.reply("Attendance channel not set.");

  const attChannel = message.guild.channels.cache.get(
    settings[guildId].attendance
  );

  if (!attChannel) return message.reply("Invalid attendance channel.");

  const embed = new EmbedBuilder()
    .setColor("Blue")
    .setTitle("📋 Staff Attendance Panel")
    .setDescription(
      "Click a button below to mark your attendance.\n\n" +
      "🟢 **Active** — You are on duty\n" +
      "🔴 **Inactive** — You are off duty"
    )
    .setFooter({ text: "Made for Falcons 🦅" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("att_active")
      .setLabel("Active")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId("att_inactive")
      .setLabel("Inactive")
      .setStyle(ButtonStyle.Danger)
  );

  await attChannel.send({
    embeds: [embed],
    components: [row]
  });

  return message.reply("✅ Attendance panel sent.");
}
    
// ===== LIST =====
if (cmd === "list" || cmd === "listactive" || cmd === "listinactive") {

  if (!settings[guildId]?.activeRole || !settings[guildId]?.inactiveRole)
    return message.reply("Roles not configured.");

  const activeRole = message.guild.roles.cache.get(
    settings[guildId].activeRole
  );
  const inactiveRole = message.guild.roles.cache.get(
    settings[guildId].inactiveRole
  );

  const active =
    activeRole?.members.map(m => `<@${m.id}>`).join("\n") || "None";

  const inactive =
    inactiveRole?.members.map(m => `<@${m.id}>`).join("\n") || "None";

  if (cmd === "listactive") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("🟢 Active Staff")
          .setDescription(active)
      ]
    });
  }

  if (cmd === "listinactive") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("🔴 Inactive Staff")
          .setDescription(inactive)
      ]
    });
  }

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("Blue")
        .setTitle("📋 Staff Attendance")
        .addFields(
          { name: "🟢 Active", value: active },
          { name: "🔴 Inactive", value: inactive }
        )
    ]
  });
}
});

// ===== BUTTON INTERACTION =====
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const guildId = interaction.guild.id;
  const member = interaction.member;

  if (!settings[guildId]) return;

  const activeRole = interaction.guild.roles.cache.get(
    settings[guildId]?.activeRole
  );
  const inactiveRole = interaction.guild.roles.cache.get(
    settings[guildId]?.inactiveRole
  );
  const logChannel = interaction.guild.channels.cache.get(
    settings[guildId]?.log
  );

  // ===== ACTIVE =====
  if (interaction.customId === "att_active") {
    if (inactiveRole) await member.roles.remove(inactiveRole).catch(() => {});
    if (activeRole) await member.roles.add(activeRole).catch(() => {});

    await interaction.reply({
      content: "🟢 Marked as Active",
      ephemeral: true
    });

    // LOG
    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setTitle("🟢 Attendance Marked")
            .setDescription(`${member} marked **ACTIVE**`)
            .setTimestamp()
        ]
      });
    }
  }

  // ===== INACTIVE =====
  if (interaction.customId === "att_inactive") {
    if (activeRole) await member.roles.remove(activeRole).catch(() => {});
    if (inactiveRole) await member.roles.add(inactiveRole).catch(() => {});

    await interaction.reply({
      content: "🔴 Marked as Inactive",
      ephemeral: true
    });

    // LOG
    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("🔴 Attendance Marked")
            .setDescription(`${member} marked **INACTIVE**`)
            .setTimestamp()
        ]
      });
    }
  }
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
