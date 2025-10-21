const http = require("http");
const qs = require("querystring");
const { Buffer } = require("buffer");
const crypto = require("crypto");
const fs = require("fs");

const server = http.createServer(async (req, res) => {
    logToFile(`Headers: ${JSON.stringify(req.headers)}\n`);
    logToFile(`URL: ${req.url}\n`);

    let url = processURL(req.url);
    logToFile(`Path: ${url.path}\n`);
    logToFile(`Query: ${JSON.stringify(url.queryString)}\n`);

    if (req.headers["accept-encoding"]) {
        res.statusCode = 400;
        res.statusMessage = 'Bad Request';
        res.end("we will not serve you!");
        return;
    }

    switch (url.path) {
        case "/":
            // أول ما المستخدم يدخل على الـ IP
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`
                <html>
                    <head><title>Hollow MNC</title></head>
                    <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#111;color:white;font-family:sans-serif;">
                        <h1 style="font-size:80px;">Hollow MNC</h1>
                    </body>
                </html>
            `);
            break;

        case "/hi":
            switch (req.method) {
                case "GET":
                    res.end("hello GET " + url.queryString.name);
                    break;
                case "POST":
                    let body = '';
                    req.on('data', (chunk) => {
                        body += chunk;
                    });
                    req.on('end', () => {
                        body = JSON.parse(body);
                        res.end("hello POST " + body.name);
                    });
                    break;
            }
            break;

        case "/login":
            if (await checkAuth(req.headers["authorization"])) {
                let token = await generateToken();
                res.end(token);
            } else {
                res.statusCode = 403;
                res.statusMessage = 'Not Authorized';
                res.end("credentials are not valid!");
            }
            break;

        case "/who":
            if (await checkAuth(req.headers["authorization"])) {
                res.end("http server running on node.js.");
            } else {
                res.statusCode = 403;
                res.statusMessage = 'Not Authorized';
                res.end();
            }
            break;

        default:
            res.statusCode = 406;
            res.statusMessage = 'Not Acceptable';
            res.end();
    }

});

server.listen(80, () => {
    console.log('✅ HTTP server is running on port 80');
    logToFile('server is running on port 80\n');
});

function processURL(str) {
    let arr = str.split('?');
    return {
        path: arr[0],
        queryString: qs.parse(arr[1])
    };
}

async function checkAuth(auth) {
    if (auth == undefined) return false;

    if (auth.startsWith('Basic ')) {
        auth = auth.replace('Basic ', '');
        logToFile(`Basic Auth: ${auth}\n`);
        let credentials = Buffer.from(auth, 'base64').toString();
        logToFile(`Decoded Credentials: ${credentials}\n`);
        credentials = credentials.split(':');
        return (credentials[0] == 'omar' && credentials[1] == 'VeryStrongPassword');

    } else if (auth.startsWith('Bearer ')) {
        auth = auth.replace('Bearer ', '');
        logToFile(`Bearer Token: ${auth}\n`);
        let tokens = await fs.promises.readFile('tokens', 'utf-8');
        if (tokens) {
            return (tokens.indexOf(auth) >= 0);
        } else {
            return false;
        }
    } else {
        return false;
    }
}

async function generateToken() {
    let token = crypto.randomBytes(16).toString('hex');
    logToFile(`Generated Token: ${token}\n`);

    await fs.promises.writeFile('tokens', token + '\n', 'utf-8');
    setTimeout(resetTokens, 20000);
    return token;
}

async function resetTokens() {
    logToFile('reset tokens\n');
    await fs.promises.writeFile('tokens', '', 'utf-8');
}

function logToFile(data) {
    fs.appendFileSync('server.log', `[${new Date().toISOString()}] ${data}`);
}
