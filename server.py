#!/usr/bin/env python3
"""Serve the worksheet app locally and open it in the default browser."""

from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import threading
import webbrowser
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
HOST = "127.0.0.1"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        return


class ReusableThreadingServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def available_port() -> int:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.bind((HOST, 0))
        return int(sock.getsockname()[1])


def main() -> None:
    os.chdir(PROJECT_DIR)
    port = available_port()
    url = f"http://{HOST}:{port}"

    with ReusableThreadingServer((HOST, port), QuietHandler) as server:
        print(f"Journey to the West 已启动: {url}")
        print("关闭此终端窗口即可停止服务。")
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已停止。")


if __name__ == "__main__":
    main()
