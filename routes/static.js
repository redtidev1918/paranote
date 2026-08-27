/**
 * ParaNote 静态文件路由
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";
import { sendJson, sendFile, sendText, redirect } from "../utils.js";

// ==================== 静态文件缓存 ====================

// file -> { mtimeMs, size, content }；mtime+size 校验，外部修改自动失效
const staticCache = new Map();

async function readStatic(file) {
  let st;
  try {
    st = await fs.stat(file);
  } catch {
    staticCache.delete(file);
    return null;
  }
  const cached = staticCache.get(file);
  if (cached && cached.mtimeMs === st.mtimeMs && cached.size === st.size) {
    return cached.content;
  }
  try {
    const content = await fs.readFile(file, "utf8");
    staticCache.set(file, { mtimeMs: st.mtimeMs, size: st.size, content });
    return content;
  } catch {
    staticCache.delete(file);
    return null;
  }
}

/**
 * 生成管理员设置向导页面
 */
function generateAdminSetupPage() {
  // 生成一个推荐的随机密钥
  const suggestedSecret = crypto.randomBytes(32).toString("hex");
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ParaNote - 管理员设置</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
    }
    .warning {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
    }
    .warning-title {
      color: #856404;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .warning-text {
      color: #856404;
      font-size: 14px;
      line-height: 1.6;
    }
    .step {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .step-number {
      display: inline-block;
      width: 28px;
      height: 28px;
      background: #667eea;
      color: #fff;
      border-radius: 50%;
      text-align: center;
      line-height: 28px;
      font-weight: bold;
      margin-right: 10px;
    }
    .step-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 12px;
    }
    .code-block {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 6px;
      font-family: "Monaco", "Consolas", monospace;
      font-size: 13px;
      overflow-x: auto;
      position: relative;
    }
    .code-block code {
      white-space: pre-wrap;
      word-break: break-all;
    }
    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #667eea;
      color: #fff;
      border: none;
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .copy-btn:hover { background: #5a6fd6; }
    .copy-btn.copied { background: #28a745; }
    .methods {
      display: grid;
      gap: 15px;
    }
    .method {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 15px;
    }
    .method-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 8px;
    }
    .method-desc {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
    }
    .info {
      background: #e7f3ff;
      border: 1px solid #b6d4fe;
      border-radius: 8px;
      padding: 15px;
      margin-top: 25px;
    }
    .info-title {
      color: #084298;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .info-text {
      color: #084298;
      font-size: 14px;
      line-height: 1.6;
    }
    a { color: #667eea; }
    .footer {
      margin-top: 30px;
      text-align: center;
      color: #999;
      font-size: 13px;
    }
    .footer a { color: #667eea; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔐 ParaNote 管理员设置</h1>
    <p class="subtitle">首次使用需要配置管理员密钥</p>
    
    <div class="warning">
      <div class="warning-title">⚠️ 未配置 ADMIN_SECRET</div>
      <div class="warning-text">
        管理后台需要设置 <code>ADMIN_SECRET</code> 环境变量才能使用。
        这个密钥用于保护管理功能，请妥善保管。
      </div>
    </div>
    
    <div class="step">
      <div class="step-title"><span class="step-number">1</span>生成密钥</div>
      <p style="color:#666;font-size:14px;margin-bottom:12px;">推荐使用以下随机生成的密钥：</p>
      <div class="code-block">
        <code id="secret">${suggestedSecret}</code>
        <button class="copy-btn" onclick="copySecret()">复制</button>
      </div>
    </div>
    
    <div class="step">
      <div class="step-title"><span class="step-number">2</span>配置环境变量</div>
      <div class="methods">
        <div class="method">
          <div class="method-title">方式一：.env 文件 (推荐)</div>
          <div class="method-desc">在项目根目录创建或编辑 .env 文件：</div>
          <div class="code-block">
            <code>ADMIN_SECRET=${suggestedSecret}</code>
            <button class="copy-btn" onclick="copyEnv()">复制</button>
          </div>
        </div>
        
        <div class="method">
          <div class="method-title">方式二：命令行</div>
          <div class="method-desc">启动时设置环境变量：</div>
          <div class="code-block">
            <code>ADMIN_SECRET=${suggestedSecret} paranote start</code>
            <button class="copy-btn" onclick="copyCmd()">复制</button>
          </div>
        </div>
        
        <div class="method">
          <div class="method-title">方式三：Docker</div>
          <div class="method-desc">在 docker-compose.yml 或 docker run 中设置：</div>
          <div class="code-block">
            <code>docker run -e ADMIN_SECRET=${suggestedSecret} ...</code>
            <button class="copy-btn" onclick="copyDocker()">复制</button>
          </div>
        </div>
      </div>
    </div>
    
    <div class="step">
      <div class="step-title"><span class="step-number">3</span>重启服务</div>
      <p style="color:#666;font-size:14px;">
        配置完成后，重启 ParaNote 服务，然后刷新此页面即可访问管理后台。
      </p>
    </div>
    
    <div class="info">
      <div class="info-title">💡 使用 CLI 快速初始化</div>
      <div class="info-text">
        你也可以使用命令行工具快速初始化配置：<br>
        <code style="background:#fff;padding:2px 6px;border-radius:3px;">paranote init</code><br><br>
        这会在当前目录创建 .env 文件并生成随机密钥。
      </div>
    </div>
    
    <div class="footer">
      <a href="/">返回首页</a> · 
      <a href="/docs">API 文档</a> · 
      <a href="https://github.com/zoidberg-xgd/paranote" target="_blank">GitHub</a>
    </div>
  </div>
  
  <script>
    function copyToClipboard(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = '复制';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
    
    function copySecret() {
      copyToClipboard('${suggestedSecret}', event.target);
    }
    
    function copyEnv() {
      copyToClipboard('ADMIN_SECRET=${suggestedSecret}', event.target);
    }
    
    function copyCmd() {
      copyToClipboard('ADMIN_SECRET=${suggestedSecret} paranote start', event.target);
    }
    
    function copyDocker() {
      copyToClipboard('docker run -e ADMIN_SECRET=${suggestedSecret} ...', event.target);
    }
  </script>
</body>
</html>`;
}

/**
 * 生成管理后台禁用页面 (生产环境，未配置 ADMIN_SECRET)
 */
function generateAdminDisabledPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ParaNote - 管理后台未启用</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      max-width: 500px;
      width: 100%;
      padding: 40px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    h1 { color: #333; margin-bottom: 15px; font-size: 24px; }
    p { color: #666; line-height: 1.6; margin-bottom: 20px; }
    .hint {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px;
      font-size: 14px;
      color: #666;
      text-align: left;
    }
    .hint-title { font-weight: bold; color: #333; margin-bottom: 8px; }
    a { color: #667eea; text-decoration: none; }
    .footer { margin-top: 25px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>管理后台未启用</h1>
    <p>此 ParaNote 实例的管理后台功能尚未配置。</p>
    
    <div class="hint">
      <div class="hint-title">如果你是站点管理员：</div>
      请联系服务器管理员配置 <code>ADMIN_SECRET</code> 环境变量以启用管理后台。
      <br><br>
      详细配置说明请参考 <a href="https://github.com/zoidberg-xgd/paranote#readme" target="_blank">文档</a>。
    </div>
    
    <div class="footer">
      <a href="/">返回首页</a> · 
      <a href="/docs">API 文档</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 处理静态文件路由
 * @returns {boolean} 是否已处理请求
 */
export async function handleStaticRoutes(req, res, url) {
  const pathname = url.pathname;

  if (req.method !== "GET") {
    return false;
  }

  // 健康检查 (所有模式)
  if (pathname === "/health") {
    sendText(res, 200, "ok");
    return true;
  }

  // embed.js (所有模式)
  if (pathname === "/public/embed.js" || pathname === "/embed.js") {
    const content = await readStatic(path.join(config.publicDir, "embed.js"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      sendFile(res, content, "application/javascript; charset=utf-8", "no-cache");
    }
    return true;
  }

  // loader.js - 自动加载器 (所有模式)
  if (pathname === "/public/loader.js" || pathname === "/loader.js") {
    const content = await readStatic(path.join(config.publicDir, "loader.js"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      sendFile(res, content, "application/javascript; charset=utf-8", "public, max-age=3600");
    }
    return true;
  }

  // 油猴脚本 (所有模式)
  if (pathname === "/paranote.user.js" || pathname === "/public/paranote.user.js") {
    const content = await readStatic(path.join(config.publicDir, "paranote.user.js"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      // 动态替换默认服务器地址
      const serverUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      const patched = content.replace("const DEFAULT_API_BASE = 'http://localhost:4000'", `const DEFAULT_API_BASE = '${serverUrl}'`);
      sendFile(res, patched, "application/javascript; charset=utf-8", "no-cache");
    }
    return true;
  }

  // paranote.min.js (所有模式)
  if (pathname === "/dist/paranote.min.js") {
    const content = await readStatic(path.join(config.distDir, "paranote.min.js"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      sendFile(res, content, "application/javascript; charset=utf-8", "public, max-age=3600");
    }
    return true;
  }

  // 首页 (仅 full 模式)
  if (pathname === "/" && config.deployMode === "full") {
    const content = await readStatic(path.join(config.publicDir, "index.html"));
    if (content === null) {
      sendJson(res, 404, { error: "index_not_found" });
    } else {
      sendFile(res, content, "text/html; charset=utf-8");
    }
    return true;
  }

  // API 模式根路径 - 返回 API 信息
  if (pathname === "/" && config.deployMode === "api") {
    sendJson(res, 200, {
      service: "ParaNote API",
      version: "0.1.0",
      mode: "api",
      endpoints: [
        "GET  /api/v1/comments",
        "POST /api/v1/comments",
        "POST /api/v1/comments/like",
        "DELETE /api/v1/comments",
        "GET  /api/v1/export",
        "POST /api/v1/import",
        "GET  /health",
      ],
    });
    return true;
  }

  // reader 模式根路径 - 重定向到阅读器
  if (pathname === "/" && config.deployMode === "reader") {
    redirect(res, "/public/reader.html");
    return true;
  }

  // 集成文档页面 (所有模式)
  if (pathname === "/docs" || pathname === "/public/docs.html") {
    const content = await readStatic(path.join(config.publicDir, "docs.html"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      sendFile(res, content, "text/html; charset=utf-8");
    }
    return true;
  }

  // 管理后台 (所有模式)
  if (pathname === "/admin" || pathname === "/admin.html" || pathname === "/public/admin.html") {
    // 如果 ADMIN_SECRET 未配置
    if (!config.adminSecret) {
      // 检测是否是本地访问 (localhost / 127.0.0.1 / 内网 IP)
      const host = req.headers.host || "";
      const isLocal = host.startsWith("localhost") || 
                      host.startsWith("127.0.0.1") ||
                      host.startsWith("0.0.0.0") ||
                      host.startsWith("192.168.") ||
                      host.startsWith("10.") ||
                      host.startsWith("172.");
      
      if (isLocal) {
        // 本地环境：显示完整设置向导
        const setupHtml = generateAdminSetupPage();
        sendFile(res, setupHtml, "text/html; charset=utf-8");
      } else {
        // 生产环境：只显示简单提示，不暴露密钥生成
        const simpleHtml = generateAdminDisabledPage();
        sendFile(res, simpleHtml, "text/html; charset=utf-8");
      }
      return true;
    }
    
    try {
      const content = await readStatic(path.join(config.publicDir, "admin.html"));
      if (content === null) {
        res.writeHead(404);
        res.end("Not found");
      } else {
        sendFile(res, content, "text/html; charset=utf-8");
      }
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
    return true;
  }

  // 阅读器页面 (仅 full/reader 模式)
  if (pathname === "/public/reader.html" && config.deployMode !== "api") {
    const content = await readStatic(path.join(config.publicDir, "reader.html"));
    if (content === null) {
      res.writeHead(404);
      res.end("Not found");
    } else {
      sendFile(res, content, "text/html; charset=utf-8");
    }
    return true;
  }

  // 兼容旧路由 /read (仅 full/reader 模式)
  if (pathname === "/read" && config.deployMode !== "api") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      redirect(res, "/");
    } else {
      redirect(res, `/public/reader.html?url=${encodeURIComponent(targetUrl)}&mode=reader`);
    }
    return true;
  }

  // 兼容旧路由 /import (仅 full/reader 模式)
  if (pathname === "/import" && config.deployMode !== "api") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) {
      redirect(res, "/");
    } else {
      redirect(res, `/public/reader.html?url=${encodeURIComponent(targetUrl)}&mode=raw`);
    }
    return true;
  }

  // example 页面 (仅 full 模式)
  if (pathname === "/example" && config.deployMode === "full") {
    const content = await readStatic(path.join(config.rootDir, "example", "index.html"));
    if (content === null) {
      sendJson(res, 404, { error: "example_not_found" });
    } else {
      sendFile(res, content, "text/html; charset=utf-8");
    }
    return true;
  }

  return false;
}
