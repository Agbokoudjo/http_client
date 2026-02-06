import { createServer, Server } from 'http';
import { AddressInfo } from 'net';

export interface TestServerOptions {
    port?: number;
    delay?: number;
}

export class TestServer {
    private server: Server | null = null;
    private port: number = 0;
    public responses: Map<string, { status: number; body: any; headers?: Record<string, string> }> = new Map();

    async start(options: TestServerOptions = {}): Promise<number> {
        const delay = options.delay || 0;

        return new Promise((resolve, reject) => {
            this.server = createServer((req, res) => {
                const url = req.url || '/';
                const response = this.responses.get(url);

                setTimeout(() => {
                    if (response) {
                        res.writeHead(response.status, {
                            'Content-Type': 'application/json',
                            ...response.headers
                        });
                        res.end(JSON.stringify(response.body));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Not found' }));
                    }
                }, delay);
            });

            this.server.listen(options.port || 0, () => {
                this.port = (this.server!.address() as AddressInfo).port;
                resolve(this.port);
            });

            this.server.on('error', reject);
        });
    }

    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getUrl(path: string = '/'): string {
        return `http://localhost:${this.port}${path}`;
    }

    mockResponse(path: string, status: number, body: any, headers?: Record<string, string>): void {
        this.responses.set(path, { status, body, headers });
    }

    reset(): void {
        this.responses.clear();
    }
}

