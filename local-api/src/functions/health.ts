import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';

export async function health(_request: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return {
    jsonBody: {
      service: 'railagent-api',
      status: 'ok',
      architecture: 'plan-b-azure-functions'
    }
  };
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health
});
