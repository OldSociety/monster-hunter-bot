const { REST, Routes } = require('discord.js');
const fs  = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'production';
require('dotenv').config({ path: env === 'development' ? '.env.development'
                                                        : '.env.production' });

const PROD_GUILD_IDS = (process.env.PRODGUILDIDS || '')
                        .split(',')
                        .filter(Boolean);

console.log(`Environment: ${env}`);
console.log(`CLIENTID: ${process.env.CLIENTID}`);
console.log(`PRODGUILDIDS: ${PROD_GUILD_IDS.join(',') || 'none'}`);

const commands = [];
const commandsDir = path.join(__dirname, 'commands');

for (const folder of fs.readdirSync(commandsDir)) {
  for (const file of fs.readdirSync(path.join(commandsDir, folder))
                       .filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(commandsDir, folder, file));
    if (cmd.data && cmd.execute) commands.push(cmd.data.toJSON());
    else console.log(`[WARN] ${file} missing data/execute.`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    if (env === 'development') {
      console.log('Deploying guild‑scoped commands to test server.');
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENTID,
                                        process.env.GUILDID),
        { body: commands }
      );
      console.log(`Deployed ${commands.length} commands to test guild.`);
    } else {
      // wipe global
      await rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: [] });

      // push to every prod guild
      for (const gid of PROD_GUILD_IDS) {
        await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENTID, gid),
          { body: commands }
        );
        console.log(`Updated ${commands.length} commands in guild ${gid}.`);
      }
    }
    console.log('✔ Slash command deploy complete.');
  } catch (err) {
    console.error(err);
  }
})();
