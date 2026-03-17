import http.server
import os
import urllib.request
import urllib.error

PORT = int(os.environ.get("PORT", "8000"))
N8N_WEBHOOK_URL = "https://moshnoi2000.app.n8n.cloud/webhook/539ed024-e9d2-4fd7-a928-ae14b53f4c0c"


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Allow same-origin + simple debugging from browsers
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/analyze":
            self.send_error(404, "Not Found")
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length > 0 else b""
        content_type = self.headers.get("Content-Type", "application/octet-stream")

        req = urllib.request.Request(
            N8N_WEBHOOK_URL,
            data=body,
            method="POST",
            headers={"Content-Type": content_type},
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
                status = resp.status
                resp_ct = resp.headers.get("Content-Type", "application/json; charset=utf-8")
        except urllib.error.HTTPError as e:
            data = e.read()
            status = e.code
            resp_ct = e.headers.get("Content-Type", "text/plain; charset=utf-8") if e.headers else "text/plain; charset=utf-8"
        except Exception as e:
            msg = f"Upstream error: {e}".encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return

        self.send_response(status)
        self.send_header("Content-Type", resp_ct)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    http.server.test(HandlerClass=Handler, port=PORT)

