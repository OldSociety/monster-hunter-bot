# Eldritch Road Bot

**Eldritch Road** is an idle game designed for discord servers. Players take on the role of head of a paranormal investigation organization that recruits, trains a team to take down various threats to the world. 

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/OldSociety/monster-hunter-bot.git
cd monster-hunter-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

In the root of your project, create a `.env` file and add the following variables:

```env
TOKEN=your-discord-bot-token
HELLBOUNDCHANNELID=channel-id-for-commands
BOTTESTCHANNELID=channel-id-for-testing
ADMINROLEID=your-admin-role-id
BOOSTERROLEID=your-booster-role-id
UNWANTEDROLEID=role-id-for-banned-users
GUILDID=your-discord-guild-id
DATABASE_URL=sqlite://dev.sqlite # SQLite file for development
```

#### Optional: Create `.env.development` or `.env.production`

For specific environments create `.env.development` or `.env.production` files with the corresponding environment-specific configurations.

### 4. Running Migrations

```bash
npx sequelize-cli db:migrate --env development
```

### 5. Deploy Commands

```bash
node deploy-commands.js
```

### 6. Run the Bot

For development:

```bash
npm run start:dev
```

For production:

```bash
npm run start:prod
```
