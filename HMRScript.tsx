const js = String.raw

const wsPatchScript = js`
	if (!window.__reformHMRPatched) {
		window.__reformHMRPatched = true;
		const originalWebSocket = window.WebSocket;
		window.WebSocket = function(...args) {
			const ws = new originalWebSocket(...args);
			const originalSend = ws.send.bind(ws);
			ws.send = function(data) {
				try {
					const msg = JSON.parse(data);
					if (msg.event === 'client-success') {
						window.__reformHMREmitter.dispatchEvent('afterRefresh', window.__reformHMRCreateId());
					}
				} catch(e) {}
				return originalSend(data);
			};
			return ws;
		};
		window.WebSocket.prototype = originalWebSocket.prototype;
	}
`

export const HMRScript =
	process.env.NODE_ENV === "development"
		? () => (
				<script
					id="reform-hmr-websocket-patch"
					dangerouslySetInnerHTML={{ __html: wsPatchScript }}
				/>
			)
		: () => null
