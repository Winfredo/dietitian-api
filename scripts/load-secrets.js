const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const fs = require("fs");

async function loadSecrets() {
  const env = process.env.NODE_ENV === "production" ? "prod" : "dev";
  const secretId = `ai-dietitian/${env}/app-secrets`;

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || "eu-west-1" });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  const secrets = JSON.parse(response.SecretString);

  const envFileContent = Object.entries(secrets)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(".env", envFileContent);
  console.log(`Loaded secrets from ${secretId}`);
}

loadSecrets().catch((err) => {
  console.error("Failed to load secrets:", err);
  process.exit(1);
});