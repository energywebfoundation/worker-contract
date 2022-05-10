import { ClientGatewayConfiguration } from "src/main";

export default (options?: ClientGatewayConfiguration) => () => ({
  CLIENT_GATEWAY_PORT: options?.port || process.env.CLIENT_GATEWAY_PORT || 3001,
  API_KEY: options?.apiKey || process.env.API_KEY,
  DDHUB_URL: options?.DDHubURL || process.env.DDHUB_URL
})
