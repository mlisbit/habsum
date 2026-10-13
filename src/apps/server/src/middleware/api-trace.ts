import type { RequestHandler, Response } from 'express';

const apiTrace: RequestHandler = (req, res, next) => {
  if (process.env.HABSUM_DEBUG !== 'TRACE') {
    next();
    return;
  }

  const url = req.originalUrl;
  const method = req.method;
  const chunks: Buffer[] = [];
  const write = res.write;
  const end = res.end;

  res.write = function (this: Response, ...args: Parameters<Response['write']>) {
    const [chunk, encoding] = args;
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    }
    return Reflect.apply(write, this, args);
  } as Response['write'];

  res.end = function (this: Response, ...args: Parameters<Response['end']>) {
    const [chunk, encoding] = args;
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8'));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(Buffer.from(chunk));
    }
    return Reflect.apply(end, this, args);
  } as Response['end'];

  res.once('finish', () => {
    const text = Buffer.concat(chunks).toString('utf8');
    let body: unknown = text;
    if (res.getHeader('content-type')?.toString().includes('application/json') && text) {
      try {
        body = JSON.parse(text);
      } catch {
        // Preserve the actual response text if it is not valid JSON.
      }
    }
    if (process.env.HABSUM_LOG_FORMAT === 'pretty') {
      const now = new Date();
      const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((value) => String(value).padStart(2, '0'))
        .join(':');
      const status =
        res.statusCode >= 200 && res.statusCode < 300
          ? `\u001b[32m${res.statusCode}\u001b[0m`
          : String(res.statusCode);
      const responseData = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
      const requestData =
        req.body && Object.keys(req.body).length > 0
          ? `\nRequest data:\n${JSON.stringify(req.body, null, 2)}`
          : '';
      console.log(
        `\u001b[33m${time} TRACE ${method} ${url} → \u001b[0m${status}\n${responseData}${requestData}`,
      );
      return;
    }
    console.log(
      '[habsum] API TRACE',
      JSON.stringify({
        request: { url, method, data: req.body },
        response: { statusCode: res.statusCode, data: body },
      }),
    );
  });

  next();
};

export default apiTrace;
