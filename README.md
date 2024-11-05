# Blood Hunter Bot

**Blood Hunter** is an Collectible card game designed for discord servers. Players take on the role of a monster hunter that collects the tokens of their hunt, represented by a card. The top cards in your collection contribute to your total score which is used to battle stronger monsters. Level up your monsters and increase your score to climb the latter and become a champion hunter. 

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/OldSociety/blood-hunter-bot.git
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
