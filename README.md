# green-proof

### DEV

#### 1. Prepare workspace packages
```shell
yarn purge && yarn && yarn build

```

#### 2. Run all GP parts using docker compose (in watch mode)
```
docker compose -f docker-compose.dev.yml up
```
or (without logs)

```
docker compose -f docker-compose.dev.yml up -d
```

### PROD?

#### 1. Build base image
```
docker build -t greenproofs:latest .
```

#### 2. Run all GP parts using docker compose (in prod mode)
```
docker compose up
```
or (without logs)

```
docker compose up -d
```

### Deployment

1. Create personal access token on GitHub: https://github.com/settings/tokens
2. Run `GH_TOKEN=<your_token> yarn multi-semantic-release --no-ci`
