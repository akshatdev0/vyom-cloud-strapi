# EDM Cloud

## Development

### Installation

1. Operating System Ubuntu 16.04 (Recommended)
2. Use zsh with ohmyzsh instead of bash (Recommended)
3. Install docker and docker-compose
4. Install nvm
5. Place below script in your .bashrc/.zshrc after nvm initialization

```
autoload -U add-zsh-hook
load-nvmrc() {
  local node_version="$(nvm version)"
  local nvmrc_path="$(nvm_find_nvmrc)"

  if [ -n "$nvmrc_path" ]; then
    local nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")

    if [ "$nvmrc_node_version" = "N/A" ]; then
      nvm install
    elif [ "$nvmrc_node_version" != "$node_version" ]; then
      nvm use
    fi
  elif [ "$node_version" != "$(nvm version default)" ]; then
    echo "Reverting to nvm default version"
    nvm use default
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

6. Install yarn (Recommended)
7. Install PM2 globally

### Prerequisites

1. Create a `database.env` file in project root with following content:

```
POSTGRES_USER=your-db-username
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=your-db-name
```

2. Create an `ecosystem.config.js` file in your `$HOME` with following content:

```
module.exports = {
  apps: [
    {
      name: 'your-project-app-name-for-pm2',
      cwd: 'absolute/path/to/your/project/directory',
      script: 'yarn',
      args: 'develop',
      interpreter: '/bin/zsh',      // Delete this line if not using zsh
      env: {
        NODE_ENV: 'development',
        DATABASE_HOST: '0.0.0.0',
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'your-db-name',
        DATABASE_USERNAME: 'your-db-username',
        DATABASE_PASSWORD: 'your-db-password',
      },
    },
  ],
};

```

### Develop

1. In the first terminal, start postgres

```
cd path/to/your/project/directory
docker-compose up
```

2. In the second terminal, start monitoring PM2

```
cd $HOME
pm2 monit
```

3. In the third terminal, start app using PM2

```
pm2 start ecosystem.config.js
```

4. Start developing!

---

## Production

### Installation

1. Follow Strapi AWS Deployment guide
2. Install Node 12.x
3. Install yarn (Recommended)
4. Install PM2 globally
5. Clone repository
6. Install project dependencies

```
cd path/to/your/project/directory
yarn
```

7. Create the production build

```
NODE_ENV=production yarn build
```

### Prerequisites

1. Create an `ecosystem.config.js` file in `$HOME` with following content:

```
module.exports = {
  apps: [
    {
      name: 'your-project-app-name-for-pm2',
      cwd: 'absolute/path/to/your/project/directory',
      script: 'yarn',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        DATABASE_HOST: 'rds-db-identifier.xyz.abc.rds.amazonaws.com', // AWS RDS Database Endpoint under 'Connectivity & Security' tab
        DATABASE_PORT: '5432',
        DATABASE_NAME: 'your-db-name', // DB name under 'Configuration' tab
        DATABASE_USERNAME: 'postgres', // default username
        DATABASE_PASSWORD: 'your-db-password',
      },
    },
  ],
};
```

2. Start PM2 ecosystem

```
pm2 start ecosystem.config.js
```

© Copyright 2020 | Exilien E-Distribution And Marketing LLP | All Rights Reserved
