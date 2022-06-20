import { readFileSync } from "fs";
import express from 'express';
import expressProxy from 'express-http-proxy';

const { rpcEndpoint } = JSON.parse(readFileSync(`${__dirname}/../config.json`, 'utf-8'));

const app = express();

app.use(expressProxy(rpcEndpoint, {
  proxyReqPathResolver(req) {
    const [path, query] = req.url.split('?');
    const targetURL = new URL(rpcEndpoint);
    targetURL.pathname = targetURL.pathname.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
    targetURL.search = query || '';
    return targetURL.toString();
  },
  userResDecorator(_, data, req) {
    try {
      const json = JSON.parse((data as Buffer).toString('utf-8'));
      cache(data, req)
    } finally {
      return data;
    }
  }
}));

async function cache(data: any, req: express.Request) {
  if (req.method !== 'POST') {
    return ;
  }
}

app.listen(8080);
