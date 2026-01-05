# Tauri MCP (Model Context Protocol) Server

## Overview

An MCP server that enables AI assistants (Claude, Cursor, etc.) to inspect, debug, and interact with Tauri applications in real-time.

## Research Summary

### Existing Solutions Analyzed

| Solution | Platform | Protocol | Limitations |
|----------|----------|----------|-------------|
| [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Chrome/Chromium | CDP | Chrome only |
| [CrabNebula DevTools](https://github.com/crabnebula-dev/devtools) | Tauri v1/v2 | WebSocket + gRPC | No MCP interface |
| [WebView2 CDP](https://github.com/Haprog/playwright-cdp) | Windows only | CDP | Windows-specific |
| [ios-webkit-debug-proxy](https://github.com/google/ios-webkit-debug-proxy) | iOS Safari | CDP adapter | iOS only |

### Key Insights

1. **Tauri WebView Debugging is Platform-Specific:**
   - **Windows**: Edge WebView2 supports CDP via `--remote-debugging-port=9222`
   - **macOS**: WKWebView uses private APIs, no remote debugging (App Store restriction)
   - **Linux**: webkit2gtk has limited WebInspector support

2. **CrabNebula DevTools Architecture:**
   - Uses a Rust tracing subscriber to capture logs/spans
   - Exposes WebSocket server (port printed at startup)
   - `devtools-wire-format` crate defines the gRPC protocol
   - Captures: console logs, Tauri commands, config, performance spans

3. **MCP SDK Capabilities:**
   - TypeScript SDK: `@modelcontextprotocol/sdk`
   - Supports stdio (local) and HTTP/SSE (remote) transports
   - Tools, Resources, and Prompts as core primitives

---

## Architecture Options

### Option A: CDP-Based (Windows/WebView2 Only)

```
┌─────────────────┐     CDP      ┌──────────────┐
│  Tauri App      │◄────────────►│  MCP Server  │
│  (WebView2)     │  Port 9222   │  (Node.js)   │
│  --remote-debug │              │              │
└─────────────────┘              └──────────────┘
                                        │
                                        ▼ MCP
                                 ┌──────────────┐
                                 │ Claude Code  │
                                 └──────────────┘
```

**Pros:** Full CDP support (26+ tools), battle-tested
**Cons:** Windows only, requires app restart with flag

### Option B: CrabNebula DevTools Integration

```
┌─────────────────┐   WebSocket   ┌──────────────┐
│  Tauri App      │◄─────────────►│  MCP Server  │
│  + devtools     │   Port 3033   │  (Node.js)   │
│    plugin       │               │              │
└─────────────────┘               └──────────────┘
                                         │
                                         ▼ MCP
                                  ┌──────────────┐
                                  │ Claude Code  │
                                  └──────────────┘
```

**Pros:** Cross-platform, rich Tauri-specific data
**Cons:** Need to reverse-engineer wire format, limited browser automation

### Option C: Custom Tauri Plugin + MCP Server (Recommended)

```
┌─────────────────────────────────────────────────┐
│                   Tauri App                      │
│  ┌──────────────┐    ┌─────────────────────┐    │
│  │   WebView    │◄──►│  tauri-plugin-mcp   │    │
│  │   (React)    │    │  - Console capture  │    │
│  │              │    │  - DOM inspection   │    │
│  └──────────────┘    │  - Network log      │    │
│                      │  - State snapshot   │    │
│                      │  - Screenshot       │    │
│  ┌──────────────┐    │  - Command invoke   │    │
│  │  Rust Core   │◄──►│                     │    │
│  │              │    └─────────┬───────────┘    │
│  └──────────────┘              │ HTTP/WS        │
└────────────────────────────────┼────────────────┘
                                 │
                                 ▼
                        ┌──────────────┐
                        │  MCP Server  │
                        │  (Sidecar)   │
                        └──────────────┘
                                 │
                                 ▼ MCP (stdio)
                        ┌──────────────┐
                        │ Claude Code  │
                        └──────────────┘
```

**Pros:** Full control, cross-platform, Tauri-native integration
**Cons:** More development effort

---

## Recommended Implementation: Option C

### Phase 1: Tauri Plugin (`tauri-plugin-mcp`)

A Rust plugin that exposes debugging capabilities via HTTP endpoints.

```rust
// Cargo.toml
[dependencies]
tauri-plugin-mcp = { path = "../tauri-plugin-mcp" }

// main.rs
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_mcp::init(tauri_plugin_mcp::Config {
            port: 9333,
            enabled: cfg!(debug_assertions),
        }))
        .run(tauri::generate_context!())
        .unwrap();
}
```

#### Plugin Capabilities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/screenshot` | GET | Capture WebView screenshot |
| `/console` | GET | Get console messages |
| `/network` | GET | Get network requests |
| `/state` | GET | Get Zustand/Redux state |
| `/invoke` | POST | Call Tauri command |
| `/eval` | POST | Execute JS in WebView |
| `/dom` | GET | Get DOM tree/accessibility |
| `/config` | GET | Get tauri.conf.json |

#### Rust Implementation Sketch

```rust
use axum::{Router, routing::get, Json};
use tauri::{AppHandle, Manager, WebviewWindow};

pub struct McpPlugin {
    port: u16,
    console_buffer: Arc<RwLock<Vec<ConsoleMessage>>>,
    network_buffer: Arc<RwLock<Vec<NetworkRequest>>>,
}

impl McpPlugin {
    pub fn init(config: Config) -> Self {
        // Start HTTP server on config.port
        // Inject console/network capture JS into WebView
        // Set up tracing subscriber for Rust logs
    }
}

// Endpoints
async fn screenshot(app: AppHandle) -> impl IntoResponse {
    // Use wry's screenshot API or platform-specific implementation
}

async fn console_logs(State(plugin): State<McpPlugin>) -> Json<Vec<ConsoleMessage>> {
    Json(plugin.console_buffer.read().clone())
}

async fn invoke_command(
    app: AppHandle,
    Json(req): Json<InvokeRequest>,
) -> Json<InvokeResponse> {
    // Forward to Tauri command handler
}

async fn eval_js(
    app: AppHandle,
    Json(req): Json<EvalRequest>,
) -> Json<EvalResponse> {
    let window = app.get_webview_window("main").unwrap();
    let result = window.eval(&req.script)?;
    Json(EvalResponse { result })
}
```

### Phase 2: MCP Server (`tauri-mcp-server`)

Node.js MCP server that connects to the Tauri plugin.

```typescript
// package.json
{
  "name": "tauri-mcp-server",
  "bin": "dist/index.js",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0"
  }
}
```

#### MCP Tools Definition

```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "tauri-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
    resources: {},
  }
});

// Tool: Take Screenshot
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "screenshot") {
    const response = await fetch(`http://localhost:9333/screenshot`);
    const base64 = await response.text();
    return {
      content: [{ type: "image", data: base64, mimeType: "image/png" }]
    };
  }
  // ... other tools
});

// Tools list
const TOOLS = [
  {
    name: "screenshot",
    description: "Capture a screenshot of the Tauri app window",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "read_console",
    description: "Get console messages from the app",
    inputSchema: {
      type: "object",
      properties: {
        level: { type: "string", enum: ["log", "warn", "error", "all"] },
        limit: { type: "number", default: 100 }
      }
    }
  },
  {
    name: "read_network",
    description: "Get network requests made by the app",
    inputSchema: {
      type: "object",
      properties: {
        urlPattern: { type: "string" },
        limit: { type: "number", default: 50 }
      }
    }
  },
  {
    name: "get_state",
    description: "Get current application state (Zustand stores)",
    inputSchema: {
      type: "object",
      properties: {
        store: { type: "string", description: "Store name to read" }
      }
    }
  },
  {
    name: "invoke_command",
    description: "Call a Tauri IPC command",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string" },
        args: { type: "object" }
      },
      required: ["command"]
    }
  },
  {
    name: "eval_js",
    description: "Execute JavaScript in the WebView",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string" }
      },
      required: ["script"]
    }
  },
  {
    name: "get_dom",
    description: "Get DOM tree or accessibility tree",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        format: { type: "string", enum: ["html", "accessibility"] }
      }
    }
  },
  {
    name: "click",
    description: "Click an element in the app",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        x: { type: "number" },
        y: { type: "number" }
      }
    }
  },
  {
    name: "type_text",
    description: "Type text into a focused element",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string" },
        selector: { type: "string" }
      },
      required: ["text"]
    }
  },
  {
    name: "get_config",
    description: "Get Tauri configuration",
    inputSchema: { type: "object", properties: {} }
  }
];
```

### Phase 3: WebView JavaScript Injection

Inject JavaScript to capture console, network, and enable automation.

```javascript
// Injected into WebView on load
(function() {
  window.__TAURI_MCP__ = {
    console: [],
    network: [],
    maxBufferSize: 1000,
  };

  // Capture console
  const originalConsole = { ...console };
  ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
    console[level] = (...args) => {
      window.__TAURI_MCP__.console.push({
        level,
        args: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)),
        timestamp: Date.now(),
      });
      if (window.__TAURI_MCP__.console.length > window.__TAURI_MCP__.maxBufferSize) {
        window.__TAURI_MCP__.console.shift();
      }
      originalConsole[level](...args);
    };
  });

  // Capture network (fetch)
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    const startTime = Date.now();
    try {
      const response = await originalFetch(...args);
      window.__TAURI_MCP__.network.push({
        url: typeof url === 'string' ? url : url.url,
        method: options?.method || 'GET',
        status: response.status,
        duration: Date.now() - startTime,
        timestamp: startTime,
      });
      return response;
    } catch (error) {
      window.__TAURI_MCP__.network.push({
        url: typeof url === 'string' ? url : url.url,
        method: options?.method || 'GET',
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: startTime,
      });
      throw error;
    }
  };

  // Get Zustand state
  window.__TAURI_MCP__.getState = (storeName) => {
    // Access Zustand stores via window or module
    if (window.__ZUSTAND_STORES__ && window.__ZUSTAND_STORES__[storeName]) {
      return window.__ZUSTAND_STORES__[storeName].getState();
    }
    return null;
  };

  // Click element
  window.__TAURI_MCP__.click = (selector) => {
    const el = document.querySelector(selector);
    if (el) {
      el.click();
      return true;
    }
    return false;
  };

  // Type text
  window.__TAURI_MCP__.typeText = (selector, text) => {
    const el = selector ? document.querySelector(selector) : document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  };

  // Get accessibility tree
  window.__TAURI_MCP__.getAccessibilityTree = (root = document.body, depth = 10) => {
    function traverse(el, currentDepth) {
      if (currentDepth > depth) return null;
      const role = el.getAttribute('role') || el.tagName.toLowerCase();
      const label = el.getAttribute('aria-label') || el.textContent?.slice(0, 50);
      return {
        role,
        label: label?.trim(),
        id: el.id || undefined,
        children: Array.from(el.children)
          .map(child => traverse(child, currentDepth + 1))
          .filter(Boolean),
      };
    }
    return traverse(root, 0);
  };
})();
```

---

## Usage with Claude Code

### Configuration

Add to Claude Code's MCP config:

```json
{
  "mcpServers": {
    "tauri": {
      "command": "npx",
      "args": ["tauri-mcp-server@latest", "--port", "9333"]
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "tauri": {
      "command": "node",
      "args": ["/path/to/tauri-mcp-server/dist/index.js"]
    }
  }
}
```

### Example Interactions

```
User: Take a screenshot of the app
Claude: [Uses screenshot tool] Here's the current state of your Tauri app...

User: What errors are in the console?
Claude: [Uses read_console tool] I see 3 errors:
1. TypeError: Cannot read property 'balance' of undefined
2. Network request failed: /api/prices
...

User: Get the current wallet state
Claude: [Uses get_state tool with store="walletStore"]
Current wallet state:
- 2 wallets loaded
- Active wallet: "Bitcoin Savings"
- Total balance: 0.00001222 BTC

User: Click the refresh button
Claude: [Uses click tool with selector="button[data-testid='refresh-btn']"]
Clicked the refresh button. Taking a new screenshot...
```

---

## Development Roadmap

### MVP (Week 1-2)
- [ ] Create `tauri-plugin-mcp` with basic HTTP server
- [ ] Implement screenshot endpoint
- [ ] Implement console capture
- [ ] Create basic MCP server with 3 tools

### v0.2 (Week 3-4)
- [ ] Add network request capture
- [ ] Add Zustand state inspection
- [ ] Add JS evaluation
- [ ] Add click/type automation

### v0.3 (Week 5-6)
- [ ] Add DOM/accessibility tree
- [ ] Add Tauri command invocation
- [ ] Add config reading
- [ ] Publish to crates.io and npm

### v1.0 (Week 7-8)
- [ ] Cross-platform testing
- [ ] Documentation
- [ ] Claude Code integration guide
- [ ] Performance optimization

---

## Alternative: Quick Win with CrabNebula DevTools

If you want faster results, we can create an MCP server that connects to CrabNebula DevTools' WebSocket:

```typescript
// Connect to existing CrabNebula DevTools WebSocket
// Parse the wire format (protobuf/gRPC)
// Expose as MCP tools

// This gives us:
// - Console logs
// - Tauri command traces
// - Performance spans
// - Config inspection

// But NOT:
// - Screenshots
// - DOM inspection
// - Browser automation (click, type)
```

---

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) - Reference implementation
- [CrabNebula DevTools](https://github.com/crabnebula-dev/devtools) - Tauri debugging
- [Tauri Debug Docs](https://v2.tauri.app/develop/debug/)
- [WebView2 CDP](https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/chromium-devtools-protocol)
- [devtools-wire-format](https://lib.rs/crates/devtools-wire-format) - CrabNebula protocol
